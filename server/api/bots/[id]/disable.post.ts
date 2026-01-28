/**
 * POST /api/bots/:id/disable
 *
 * Disable a bot.
 * Updates totalRuntimeSeconds based on enabledAt timestamp.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const id = validateRequestParams(event, 'id')
  const bot = await validateBotOwnership(id, user.id)

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
        reason: BotOperationReason.USER_ACTION,
      },
    }),
  ])

  // Invalidate internal bots cache
  const botsCache = createCache({ namespace: CACHE_NS.INTERNAL_BOTS })
  await botsCache.invalidateAll()

  // Invalidate wallets cache only if this was the last enabled bot for this wallet
  const remainingEnabledBots = await db.bot.count({
    where: {
      funder: bot.funder,
      enabled: true,
    },
  })
  if (remainingEnabledBots === 0) {
    const walletsCache = createCache({ namespace: CACHE_NS.INTERNAL_WALLETS })
    await walletsCache.invalidateAll()
  }

  return updatedBot
})
