/**
 * POST /api/strategies
 *
 * Create a new trading strategy.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const body = await readBody(event)
  const { name, interval, strategyJson } = validateRequestData(body, 'POST', '/api/strategies')

  // Parse and normalize strategy
  let parsedStrategy: StrategyConfig
  try {
    parsedStrategy = JSON.parse(strategyJson)
  } catch {
    throwApiError(400, ERROR_CODES.STRATEGY_INVALID_JSON)
  }

  // Normalize strategy configuration
  const normalizedStrategy = normalizeStrategy(parsedStrategy)

  // Validate that strategy has at least one buy step
  if (!hasTradeStepsBuy(normalizedStrategy)) {
    throwApiError(400, ERROR_CODES.STRATEGY_NO_BUY_STEPS)
  }

  const normalizedStrategyJson = stringifyTradeSteps(normalizedStrategy)
  const amount = calculateStrategyMaxAmount(normalizedStrategy)

  // Validate subscription limits (count + amount)
  const ctx = createSubscriptionContext(user.id)
  await Promise.all([
    validateStrategyCount(user.id, 1, ctx),
    validateStrategyAmount(user.id, Number(amount), ctx),
  ])

  // Generate strategy hash
  const strategyHash = sha256(normalizedStrategyJson)

  // Validate strategy does not already exist
  await validateStrategyNotExists(user.id, strategyHash, interval)

  // Create strategy record
  const strategy = await db.strategy.create({
    data: {
      name,
      interval,
      strategyJson: normalizedStrategyJson,
      strategyHash,
      amount,
      ownerId: user.id,
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
