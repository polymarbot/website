/**
 * POST /api/bots
 *
 * Create a new bot for market trading.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const body = await readBody(event)
  const { symbol, interval, funder, strategyId } = validateRequestData(body, 'POST', '/api/bots')

  // Verify wallet and strategy ownership
  await validateWalletOwnership(funder, user.id)
  const strategy = await validateStrategyOwnership(strategyId, user.id)

  // Validate subscription limits (bot count + strategy amount)
  const ctx = createSubscriptionContext(user.id)
  await Promise.all([
    validateBotCount(user.id, 1, ctx),
    validateStrategyAmount(user.id, Number(strategy.amount), ctx),
  ])

  // Check if bot already exists
  await validateBotNotExists(symbol, interval, funder)

  // Create bot
  const bot = await db.bot.create({
    data: {
      symbol,
      interval,
      funder,
      strategyId,
      enabled: false,
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
  })

  return bot
})
