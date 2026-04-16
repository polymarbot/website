/**
 * Scheduled Task: Enforce Subscription Limits
 *
 * Comprehensive task that runs daily to:
 * 1. Delete expired paid subscriptions (user falls back to FREE)
 * 2. Check ALL users' enabled bots against their plan limits and disable non-compliant bots
 *
 * Schedule: Daily at 2:00 AM UTC (configured in nuxt.config.ts)
 *
 * Bot disable algorithm:
 * 1. First disable bots with strategy maxBuySize exceeding plan limit
 * 2. Then disable bots by maxBuySize (lowest first) until count <= plan limit
 *
 * Performance: Phase 2 uses batched processing to avoid loading all bots into memory at once.
 */

// Number of users to process per batch in Phase 2
const USER_BATCH_SIZE = 50

// ============================================================================
// Type Definitions
// ============================================================================

interface BotWithStrategy {
  id: string
  enabledAt: Date | null
  totalRuntimeSeconds: number
  strategyMaxBuySize: number
}

interface UserEnforceResult {
  userId: string
  disabledCount: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Select bots to disable based on plan limits:
 * 1. Bots with strategy maxBuySize exceeding plan limit
 * 2. Excess bots beyond count limit (lowest maxBuySize first)
 */
function selectBotsToDisable (bots: BotWithStrategy[], limits: PlanLimits): BotWithStrategy[] {
  const toDisable: BotWithStrategy[] = []
  const toKeep: BotWithStrategy[] = []

  // Step 1: Separate bots by strategy maxBuySize limit
  for (const bot of bots) {
    if (limits.maxBuySize !== null && bot.strategyMaxBuySize > limits.maxBuySize) {
      toDisable.push(bot)
    } else {
      toKeep.push(bot)
    }
  }

  // Step 2: Handle count limit (sort by maxBuySize ascending, disable lowest first)
  if (toKeep.length > limits.bots) {
    toKeep.sort((a, b) => a.strategyMaxBuySize - b.strategyMaxBuySize)
    const excess = toKeep.length - limits.bots
    for (let i = 0; i < excess; i++) {
      toDisable.push(toKeep[i]!)
    }
  }

  return toDisable
}

/**
 * Disable bots and record operation history in a transaction
 */
async function disableBots (bots: BotWithStrategy[], reason: string): Promise<void> {
  if (bots.length === 0) return

  const now = new Date()

  const botUpdates = bots.map(bot => {
    let additionalRuntime = 0
    if (bot.enabledAt) {
      additionalRuntime = Math.floor((now.getTime() - bot.enabledAt.getTime()) / 1000)
    }

    return appDb.bot.update({
      where: { id: bot.id },
      data: {
        enabled: false,
        enabledAt: null,
        totalRuntimeSeconds: bot.totalRuntimeSeconds + additionalRuntime,
      },
    })
  })

  const historyRecords = bots.map(bot =>
    appDb.botOperationHistory.create({
      data: {
        botId: bot.id,
        action: BotOperationType.DISABLED,
        reason,
      },
    }),
  )

  await appDb.$transaction([ ...botUpdates, ...historyRecords ])
}

// ============================================================================
// Task Definition
// ============================================================================

export default defineTask({
  meta: {
    name: 'subscription:enforce-limits',
    description: 'Delete expired subscriptions and enforce plan limits on all users\' bots',
  },

  async run () {
    const startTime = Date.now()
    const TAG = '[subscription:enforce-limits]'
    console.debug(`${TAG} Task started`)

    // ========================================================================
    // Phase 1: Delete expired subscriptions
    // ========================================================================

    const now = new Date()
    const { count: expiredCount } = await appDb.userSubscription.deleteMany({
      where: {
        plan: { not: SubscriptionPlan.FREE },
        expiresAt: { lt: now },
      },
    })

    if (expiredCount > 0) {
      console.debug(`${TAG} Deleted ${expiredCount} expired subscription(s)`)
    } else {
      console.debug(`${TAG} No expired subscriptions found`)
    }

    // ========================================================================
    // Phase 2: Enforce bot limits for all users (batched)
    // ========================================================================

    // Lightweight query: get distinct user IDs who have enabled bots
    const usersWithBots = await appDb.wallet.findMany({
      where: { bots: { some: { enabled: true }}},
      select: { ownerId: true },
      distinct: [ 'ownerId' ],
    })
    const allUserIds = usersWithBots.map(w => w.ownerId)

    if (allUserIds.length === 0) {
      console.debug(`${TAG} No enabled bots found`)
      return {
        result: {
          success: true,
          expiredSubscriptionsDeleted: expiredCount,
          processedUsers: 0,
          totalDisabled: 0,
          details: [] as UserEnforceResult[],
          duration: Date.now() - startTime,
        },
      }
    }

    console.debug(`${TAG} Found ${allUserIds.length} user(s) with enabled bots, processing in batches of ${USER_BATCH_SIZE}`)

    const results: UserEnforceResult[] = []
    let totalDisabled = 0
    let processedUsers = 0

    // Process users in batches to limit memory usage
    for (let i = 0; i < allUserIds.length; i += USER_BATCH_SIZE) {
      const batchUserIds = allUserIds.slice(i, i + USER_BATCH_SIZE)

      // Fetch bots and subscriptions for this batch only
      const [ batchBots, batchSubscriptions ] = await Promise.all([
        appDb.bot.findMany({
          where: {
            enabled: true,
            wallet: { ownerId: { in: batchUserIds }},
          },
          select: {
            id: true,
            enabledAt: true,
            totalRuntimeSeconds: true,
            strategy: { select: { maxBuySize: true }},
            wallet: { select: { ownerId: true }},
          },
        }),
        appDb.userSubscription.findMany({
          where: { userId: { in: batchUserIds }},
          select: { userId: true, plan: true, expiresAt: true },
        }),
      ])

      // Group bots by user
      const botsByUser = new Map<string, BotWithStrategy[]>()
      for (const bot of batchBots) {
        const userId = bot.wallet.ownerId
        if (!botsByUser.has(userId)) {
          botsByUser.set(userId, [])
        }
        botsByUser.get(userId)!.push({
          id: bot.id,
          enabledAt: bot.enabledAt,
          totalRuntimeSeconds: bot.totalRuntimeSeconds,
          strategyMaxBuySize: bot.strategy.maxBuySize,
        })
      }

      const subscriptionMap = new Map(batchSubscriptions.map(s => [ s.userId, s ]))

      // Enforce limits per user
      for (const [ userId, bots ] of botsByUser) {
        try {
          const sub = subscriptionMap.get(userId)
          const plan = sub?.plan ?? SubscriptionPlan.FREE
          const expiresAt = sub?.expiresAt ?? null
          const limits = getPlanLimits(plan, expiresAt)

          const toDisable = selectBotsToDisable(bots, limits)
          if (toDisable.length === 0) continue

          await disableBots(toDisable, BotOperationReason.PLAN_LIMIT_EXCEEDED)
          totalDisabled += toDisable.length

          results.push({ userId, disabledCount: toDisable.length })

          console.debug(`${TAG} User ${userId}: disabled ${toDisable.length} bot(s)`)
        } catch (error) {
          console.error(`${TAG} Error processing user ${userId}:`, error)
        }
      }

      processedUsers += botsByUser.size
    }

    // Invalidate caches if any bots were disabled
    if (totalDisabled > 0) {
      const botsCache = createCache({ namespace: CACHE_NS.INTERNAL_BOTS })
      await botsCache.invalidateAll()

      const walletsCache = createCache({ namespace: CACHE_NS.INTERNAL_WALLETS })
      await walletsCache.invalidateAll()

      console.debug(`${TAG} Caches invalidated`)
    }

    const duration = Date.now() - startTime
    console.debug(
      `${TAG} Task completed in ${duration}ms. `
      + `Expired subscriptions deleted: ${expiredCount}, `
      + `Processed ${processedUsers} user(s), disabled ${totalDisabled} bot(s)`,
    )

    return {
      result: {
        success: true,
        expiredSubscriptionsDeleted: expiredCount,
        processedUsers,
        totalDisabled,
        details: results,
        duration,
      },
    }
  },
})
