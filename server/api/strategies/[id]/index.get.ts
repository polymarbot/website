/**
 * GET /api/strategies/:id
 *
 * Get a single strategy by ID for the authenticated user.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const id = validateRequestParams(event, 'id')
  const strategy = await validateStrategyOwnership(id, user.id)

  // Count bots using this strategy
  const botCount = await db.bot.count({
    where: { strategyId: strategy.id },
  })

  return {
    id: strategy.id,
    name: strategy.name,
    interval: strategy.interval,
    strategyJson: strategy.strategyJson,
    amount: strategy.amount,
    botCount,
    createdAt: strategy.createdAt,
    updatedAt: strategy.updatedAt,
  }
})
