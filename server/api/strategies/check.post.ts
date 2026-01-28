/**
 * POST /api/strategies/check
 *
 * Check if a strategy exists by strategyJson and interval.
 * Server calculates the hash from strategyJson.
 * Returns the strategy if found, null otherwise.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const body = await readBody(event)
  const { strategyJson, interval } = validateRequestData(body, 'POST', '/api/strategies/check')

  // Parse strategy and calculate hash (no normalization needed for ranking data)
  const parsedStrategy: StrategyConfig = safeJsonParse(strategyJson, [])
  const strategyHash = sha256(stringifyTradeSteps(parsedStrategy))

  // Find strategy by hash and interval for current user
  const strategy = await db.strategy.findFirst({
    where: {
      ownerId: user.id,
      strategyHash,
      interval,
    },
    select: {
      id: true,
      name: true,
      interval: true,
      strategyJson: true,
      amount: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return strategy
})
