/**
 * POST /api/internal/bots/:id/disable
 *
 * Disable a bot by its ID.
 * Updates totalRuntimeSeconds based on enabledAt timestamp.
 *
 * Authentication: Bearer token via Authorization header
 */
export default defineWrappedResponseHandler(async event => {
  await requireInternalApiKey(event)

  const id = validateRequestParams(event, 'id')
  const body = await readBody(event)
  const { reason } = validateRequestData(body, 'POST', '/api/internal/bots/[id]/disable')

  // Find bot (no ownership check for internal API)
  const bot = await validateBotExists(id)

  // Calculate runtime to add
  let additionalRuntime = 0
  if (bot.enabledAt) {
    const now = new Date()
    additionalRuntime = Math.floor((now.getTime() - bot.enabledAt.getTime()) / 1000)
  }

  // Disable bot and create operation history
  const [ updatedBot ] = await db.$transaction([
    db.bot.update({
      where: { id },
      data: {
        enabled: false,
        enabledAt: null,
        totalRuntimeSeconds: bot.totalRuntimeSeconds + additionalRuntime,
      },
      select: {
        id: true,
        symbol: true,
        interval: true,
        funder: true,
        strategyId: true,
        enabled: true,
        enabledAt: true,
        totalRuntimeSeconds: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.botOperationHistory.create({
      data: {
        botId: id,
        action: BotOperationType.DISABLED,
        reason: reason,
      },
    }),
  ])

  // Invalidate internal bots cache
  const botsCache = createCache({ namespace: CACHE_NS.INTERNAL_BOTS })
  await botsCache.invalidateAll()

  // Invalidate wallets cache only if this was the last enabled bot for this wallet
  const remainingEnabledBots = await db.bot.count({
    where: {
      funder: updatedBot.funder,
      enabled: true,
    },
  })
  if (remainingEnabledBots === 0) {
    const walletsCache = createCache({ namespace: CACHE_NS.INTERNAL_WALLETS })
    await walletsCache.invalidateAll()
  }

  return updatedBot
})
