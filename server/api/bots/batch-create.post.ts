/**
 * POST /api/bots/batch-create
 *
 * Batch create bots for multiple symbols using one wallet.
 * Creates one bot per symbol for the specified wallet.
 * Skips symbols that already have a bot for that wallet.
 *
 * @param body.interval - Required: market interval
 * @param body.symbols - Optional: array of symbols to create bots for (if empty, creates for all symbols)
 * @param body.funder - Required: wallet address to use for all bots
 * @param body.strategyId - Required: strategy ID to use for all bots
 *
 * @returns created - Number of bots created successfully
 * @returns skipped - Number of bot creations skipped (wallet already has bot for that symbol+interval)
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const body = await readBody(event)
  const { interval, symbols, funder, strategyId } = validateRequestData(body, 'POST', '/api/bots/batch-create')

  // Validate wallet ownership
  await validateWalletOwnership(funder, user.id)

  // Validate strategy ownership and get strategy info
  const strategy = await validateStrategyOwnership(strategyId, user.id)

  // Validate strategy interval matches
  if (strategy.interval !== interval) {
    throwApiError(400, ERROR_CODES.COMMON_VALIDATION_ERROR)
  }

  // Determine target symbols (all symbols if not specified)
  const targetSymbols: MarketSymbolType[] = symbols && symbols.length > 0
    ? symbols
    : Object.values(MarketSymbol)

  // Get existing bots for this wallet and interval to avoid duplicates
  const existingBots = await db.bot.findMany({
    where: {
      symbol: { in: targetSymbols },
      interval,
      funder,
    },
    select: {
      symbol: true,
    },
  })

  // Create a set of existing symbols for fast lookup
  const existingSymbols = new Set(existingBots.map(b => b.symbol))

  // Filter symbols that don't have bots yet
  const symbolsToCreate = targetSymbols.filter(symbol => !existingSymbols.has(symbol))

  // Calculate skipped count
  const skippedCount = targetSymbols.length - symbolsToCreate.length

  // Validate subscription limits (bot count + strategy amount)
  if (symbolsToCreate.length > 0) {
    const ctx = createSubscriptionContext(user.id)
    await Promise.all([
      validateBotCount(user.id, symbolsToCreate.length, ctx),
      validateStrategyAmount(user.id, Number(strategy.amount), ctx),
    ])
  }

  // Create bots in batch
  let createdCount = 0

  if (symbolsToCreate.length > 0) {
    const createdBots = await db.bot.createManyAndReturn({
      data: symbolsToCreate.map(symbol => ({
        symbol,
        interval,
        funder,
        strategyId,
        enabled: false,
      })),
      select: { id: true },
    })

    createdCount = createdBots.length
  }

  return {
    created: createdCount,
    skipped: skippedCount,
  }
})
