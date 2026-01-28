/**
 * PATCH /api/strategies/:id
 *
 * Update a strategy for the authenticated user.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const id = validateRequestParams(event, 'id')
  const body = await readBody(event)
  const { name, interval, strategyJson } = validateRequestData(body, 'PATCH', '/api/strategies/[id]')

  const strategy = await validateStrategyOwnership(id, user.id)

  // Build update data
  const updateData: {
    name?: string
    interval?: typeof interval
    strategyJson?: string
    strategyHash?: string
    amount?: number
  } = {}

  if (name !== undefined) {
    updateData.name = name
  }

  // Interval cannot be modified after creation
  if (interval !== undefined && interval !== strategy.interval) {
    throwApiError(400, ERROR_CODES.STRATEGY_INTERVAL_NOT_MODIFIABLE)
  }

  if (strategyJson !== undefined) {
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

    // Validate strategy amount against subscription limit
    const newAmount = calculateStrategyMaxAmount(normalizedStrategy)
    await validateStrategyAmount(user.id, Number(newAmount))

    // Serialize and generate strategy hash
    const normalizedStrategyJson = stringifyTradeSteps(normalizedStrategy)
    const strategyHash = sha256(normalizedStrategyJson)

    // Check if strategy with same hash already exists (excluding current strategy)
    const existingStrategy = await db.strategy.findFirst({
      where: {
        ownerId: user.id,
        strategyHash,
        interval: strategy.interval,
        id: { not: id },
      },
    })

    if (existingStrategy) {
      throwApiError(400, ERROR_CODES.STRATEGY_ALREADY_EXISTS)
    }

    updateData.strategyJson = normalizedStrategyJson
    updateData.strategyHash = strategyHash
    updateData.amount = newAmount
  }

  // Update strategy
  const updatedStrategy = await db.strategy.update({
    where: { id },
    data: updateData,
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

  // Invalidate internal bots cache if strategy has enabled bots
  const enabledBotCount = await db.bot.count({
    where: {
      strategyId: id,
      enabled: true,
    },
  })
  if (enabledBotCount > 0) {
    const cache = createCache({ namespace: CACHE_NS.INTERNAL_BOTS })
    await cache.invalidateAll()
  }

  return updatedStrategy
})
