/**
 * POST /api/bots/batch-disable
 *
 * Batch disable enabled bots for the current user.
 * Supports optional filtering by symbols, intervals, funder, strategyId, or bot IDs.
 * Updates totalRuntimeSeconds for each bot based on enabledAt timestamp.
 *
 * @param body.symbols - Optional: filter by market symbols array
 * @param body.intervals - Optional: filter by market intervals array
 * @param body.funder - Optional: filter by wallet address
 * @param body.strategyId - Optional: filter by strategy ID
 * @param body.ids - Optional: array of bot IDs to disable
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const body = await readBody(event)
  const { symbols, intervals, funder, strategyId, ids } = validateRequestData(body, 'POST', '/api/bots/batch-disable')

  // Build filter conditions
  const whereConditions: any = {
    wallet: {
      ownerId: user.id,
    },
    enabled: true,
  }

  // Filter by IDs if provided
  if (ids && ids.length > 0) {
    whereConditions.id = { in: ids }
  }

  // Filter by other fields if ids are not provided
  if (!ids || ids.length === 0) {
    if (symbols && symbols.length > 0) {
      whereConditions.symbol = { in: symbols }
    }
    if (intervals && intervals.length > 0) {
      whereConditions.interval = { in: intervals }
    }
    if (funder) {
      whereConditions.funder = funder
    }
    if (strategyId) {
      whereConditions.strategyId = strategyId
    }
  }

  // Find all enabled bots matching the criteria
  const enabledBots = await db.bot.findMany({
    where: whereConditions,
    select: {
      id: true,
      funder: true,
      enabledAt: true,
      totalRuntimeSeconds: true,
    },
  })

  if (enabledBots.length === 0) {
    return { disabledCount: 0 }
  }

  const now = new Date()

  // Prepare bot updates with runtime calculation
  const botUpdates = enabledBots.map(bot => {
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

  // Prepare operation history records
  const historyRecords = enabledBots.map(bot =>
    db.botOperationHistory.create({
      data: {
        botId: bot.id,
        action: BotOperationType.DISABLED,
        reason: BotOperationReason.USER_ACTION,
      },
    }),
  )

  // Execute all updates in a transaction
  await db.$transaction([
    ...botUpdates,
    ...historyRecords,
  ])

  // Invalidate internal caches
  const botsCache = createCache({ namespace: CACHE_NS.INTERNAL_BOTS })
  await botsCache.invalidateAll()

  // Invalidate wallets cache for all affected wallets
  const walletsCache = createCache({ namespace: CACHE_NS.INTERNAL_WALLETS })
  await walletsCache.invalidateAll()

  return { disabledCount: enabledBots.length }
})
