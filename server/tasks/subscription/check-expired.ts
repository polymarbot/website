/**
 * Scheduled Task: Check Expired Subscriptions
 *
 * Runs daily to check for users with expired paid subscriptions
 * and enforces FREE plan limits on their bots.
 *
 * Schedule: Daily at 2:00 AM UTC (configured in nuxt.config.ts)
 *
 * Algorithm:
 * 1. First disable all bots with strategy amount > maxStrategyAmount ($2)
 * 2. Then disable bots by amount (highest first) until count <= limit (5)
 */

// ============================================================================
// Type Definitions
// ============================================================================

interface BotWithStrategy {
  id: string
  funder: string
  enabledAt: Date | null
  totalRuntimeSeconds: number
  strategyAmount: number
}

interface EnforceLimitsResult {
  userId: string
  disabledCount: number
  amountExceeded: number
  countExceeded: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all enabled bots for a user with strategy amounts
 */
async function getUserEnabledBots (userId: string): Promise<BotWithStrategy[]> {
  const bots = await db.bot.findMany({
    where: {
      wallet: { ownerId: userId },
      enabled: true,
    },
    select: {
      id: true,
      funder: true,
      enabledAt: true,
      totalRuntimeSeconds: true,
      strategy: {
        select: {
          amount: true,
        },
      },
    },
  })

  return bots.map(bot => ({
    id: bot.id,
    funder: bot.funder,
    enabledAt: bot.enabledAt,
    totalRuntimeSeconds: bot.totalRuntimeSeconds,
    strategyAmount: Number(bot.strategy.amount),
  }))
}

/**
 * Select bots to disable based on FREE plan limits
 */
function selectBotsToDisable (
  bots: BotWithStrategy[],
  limits: PlanLimits,
): { toDisable: BotWithStrategy[], amountExceeded: number, countExceeded: number } {
  const toDisable: BotWithStrategy[] = []
  const toKeep: BotWithStrategy[] = []
  let amountExceeded = 0
  let countExceeded = 0

  // Step 1: Separate bots by strategy amount limit
  for (const bot of bots) {
    if (limits.maxStrategyAmount !== null && bot.strategyAmount > limits.maxStrategyAmount) {
      toDisable.push(bot)
      amountExceeded++
    } else {
      toKeep.push(bot)
    }
  }

  // Step 2: Handle count limit (sort by amount descending, disable highest first)
  if (toKeep.length > limits.bots) {
    toKeep.sort((a, b) => b.strategyAmount - a.strategyAmount)

    const excess = toKeep.length - limits.bots
    countExceeded = excess

    for (let i = 0; i < excess; i++) {
      toDisable.push(toKeep[i]!)
    }
  }

  return { toDisable, amountExceeded, countExceeded }
}

/**
 * Disable bots and record operation history
 */
async function disableBots (bots: BotWithStrategy[], reason: string): Promise<void> {
  if (bots.length === 0) return

  const now = new Date()

  const botUpdates = bots.map(bot => {
    let additionalRuntime = 0
    if (bot.enabledAt) {
      additionalRuntime = Math.floor((now.getTime() - bot.enabledAt.getTime()) / 1000)
    }

    return db.bot.update({
      where: { id: bot.id },
      data: {
        enabled: false,
        enabledAt: null,
        totalRuntimeSeconds: bot.totalRuntimeSeconds + additionalRuntime,
      },
    })
  })

  const historyRecords = bots.map(bot =>
    db.botOperationHistory.create({
      data: {
        botId: bot.id,
        action: BotOperationType.DISABLED,
        reason,
      },
    }),
  )

  await db.$transaction([ ...botUpdates, ...historyRecords ])
}

/**
 * Enforce FREE plan limits on a single user
 */
async function enforceUserLimits (userId: string, limits: PlanLimits): Promise<EnforceLimitsResult> {
  const enabledBots = await getUserEnabledBots(userId)

  if (enabledBots.length === 0) {
    return { userId, disabledCount: 0, amountExceeded: 0, countExceeded: 0 }
  }

  const { toDisable, amountExceeded, countExceeded } = selectBotsToDisable(enabledBots, limits)

  await disableBots(toDisable, BotOperationReason.SUBSCRIPTION_EXPIRED)

  return { userId, disabledCount: toDisable.length, amountExceeded, countExceeded }
}

// ============================================================================
// Task Definition
// ============================================================================

export default defineTask({
  meta: {
    name: 'subscription:check-expired',
    description: 'Check expired subscriptions and enforce FREE plan limits',
  },

  async run () {
    const startTime = Date.now()
    console.debug('[subscription:check-expired] Task started')

    const freeLimits = SUBSCRIPTION_PLANS[SubscriptionPlan.FREE].limits

    // Query users with expired paid subscriptions
    const now = new Date()
    const expiredSubscriptions = await db.userSubscription.findMany({
      where: {
        plan: { not: SubscriptionPlan.FREE },
        expiresAt: { lt: now },
      },
      select: {
        userId: true,
        plan: true,
        expiresAt: true,
      },
    })

    if (expiredSubscriptions.length === 0) {
      console.debug('[subscription:check-expired] No expired subscriptions found')
      return {
        result: {
          success: true,
          processedUsers: 0,
          totalDisabled: 0,
          details: [] as EnforceLimitsResult[],
          duration: Date.now() - startTime,
        },
      }
    }

    console.debug(`[subscription:check-expired] Found ${expiredSubscriptions.length} expired subscription(s)`)

    const results: EnforceLimitsResult[] = []
    let totalDisabled = 0

    for (const subscription of expiredSubscriptions) {
      try {
        const result = await enforceUserLimits(subscription.userId, freeLimits)
        results.push(result)
        totalDisabled += result.disabledCount

        if (result.disabledCount > 0) {
          console.debug(
            `[subscription:check-expired] User ${subscription.userId}: disabled ${result.disabledCount} bot(s) `
            + `(amount exceeded: ${result.amountExceeded}, count exceeded: ${result.countExceeded})`,
          )
        }
      } catch (error) {
        console.error(`[subscription:check-expired] Error processing user ${subscription.userId}:`, error)
      }
    }

    // Invalidate caches if any bots were disabled
    if (totalDisabled > 0) {
      const botsCache = createCache({ namespace: CACHE_NS.INTERNAL_BOTS })
      await botsCache.invalidateAll()

      const walletsCache = createCache({ namespace: CACHE_NS.INTERNAL_WALLETS })
      await walletsCache.invalidateAll()

      console.debug('[subscription:check-expired] Caches invalidated')
    }

    const duration = Date.now() - startTime
    console.debug(
      `[subscription:check-expired] Task completed in ${duration}ms. `
      + `Processed ${results.length} user(s), disabled ${totalDisabled} bot(s)`,
    )

    return {
      result: {
        success: true,
        processedUsers: results.length,
        totalDisabled,
        details: results.filter(r => r.disabledCount > 0),
        duration,
      },
    }
  },
})
