/**
 * GET /api/market-strategies/:id
 *
 * Get a single market strategy by ID from bot_db.
 * This endpoint returns public strategy data from the rankings system.
 */
export default defineWrappedResponseHandler(async event => {
  const id = validateRequestParams(event, 'id')

  const strategy = await botDb.marketStrategy.findUnique({
    where: { id: parseInt(id, 10) },
    select: {
      id: true,
      strategyJson: true,
      amount: true,
      interval: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!strategy) {
    throwApiError(404, ERROR_CODES.STRATEGY_NOT_FOUND)
  }

  return {
    id: strategy.id,
    strategyJson: strategy.strategyJson,
    amount: strategy.amount.toString(),
    interval: strategy.interval,
    createdAt: strategy.createdAt.toISOString(),
    updatedAt: strategy.updatedAt.toISOString(),
  }
})
