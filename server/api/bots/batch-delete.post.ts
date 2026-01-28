/**
 * POST /api/bots/batch-delete
 *
 * Batch delete disabled bots for the current user.
 * Supports optional filtering by symbols, intervals, funder, strategyId, or bot IDs.
 * Skips bots that are enabled (can only delete disabled bots).
 *
 * @param body.symbols - Optional: filter by market symbols array
 * @param body.intervals - Optional: filter by market intervals array
 * @param body.funder - Optional: filter by wallet address
 * @param body.strategyId - Optional: filter by strategy ID
 * @param body.ids - Optional: array of bot IDs to delete
 *
 * @returns deletedCount - Number of bots deleted
 * @returns skippedCount - Number of bots skipped (enabled bots cannot be deleted)
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const body = await readBody(event)
  const { symbols, intervals, funder, strategyId, ids } = validateRequestData(body, 'POST', '/api/bots/batch-delete')

  // Build filter conditions (without enabled filter to count all matching bots)
  const whereConditions: any = {
    wallet: {
      ownerId: user.id,
    },
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

  // Find all bots matching the criteria
  const bots = await db.bot.findMany({
    where: whereConditions,
    select: {
      id: true,
      enabled: true,
    },
  })

  if (bots.length === 0) {
    return { deletedCount: 0, skippedCount: 0 }
  }

  // Separate disabled bots (can be deleted) from enabled bots (must skip)
  const deletableBotIds = bots.filter(bot => !bot.enabled).map(bot => bot.id)
  const skippedCount = bots.length - deletableBotIds.length

  if (deletableBotIds.length > 0) {
    // Delete bots (cascades to BotOperationHistory)
    await db.bot.deleteMany({
      where: {
        id: { in: deletableBotIds },
      },
    })
  }

  return {
    deletedCount: deletableBotIds.length,
    skippedCount,
  }
})
