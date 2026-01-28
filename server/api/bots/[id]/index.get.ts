/**
 * GET /api/bots/:id
 *
 * Get bot details by ID.
 * Returns bot information including wallet and strategy details.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const id = validateRequestParams(event, 'id')
  const bot = await validateBotOwnershipWithDetails(id, user.id)

  // Query balance using single RPC call
  const balance = await getUSDCBalanceCached(bot.funder)

  return {
    id: bot.id,
    symbol: bot.symbol,
    interval: bot.interval,
    funder: bot.funder,
    strategyId: bot.strategyId,
    enabled: bot.enabled,
    enabledAt: bot.enabledAt,
    totalRuntimeSeconds: bot.totalRuntimeSeconds,
    createdAt: bot.createdAt,
    updatedAt: bot.updatedAt,
    wallet: {
      name: bot.wallet.name,
      status: bot.wallet.status,
      balance: formatBalance(balance),
    },
    strategy: {
      name: bot.strategy.name,
      amount: bot.strategy.amount,
    },
  }
})
