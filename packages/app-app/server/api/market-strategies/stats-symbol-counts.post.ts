/**
 * POST /api/market-strategies/stats-symbol-counts
 *
 * Get per-symbol participation counts for a strategy.
 * Independent from the stats API so that switching symbol filters
 * does not re-fetch these counts.
 *
 * Body parameters:
 * - strategyJson: Strategy configuration JSON string
 * - interval: Market interval (e.g., '5m', '1h', '1d')
 * - botId: Filter by bot ID (optional)
 * - datePreset: Date range preset (WEEK, MONTH, QUARTER, ALL, CUSTOM)
 * - customStart: Custom start time for CUSTOM preset (unix timestamp)
 * - customEnd: Custom end time for CUSTOM preset (unix timestamp)
 *
 * Returns Record<string, number> (symbol -> count)
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const body = await readBody(event)
  const { strategyJson, interval, botId, datePreset, customStart, customEnd } = validateRequestData(body, 'POST', '/api/market-strategies/stats-symbol-counts')

  // Validate stats access permission (throws 403 if denied)
  await validateStatsAccess(user.id, datePreset, { botId })

  // Calculate time range from preset
  const { startTime, endTime } = getTimeRangeFromPreset(datePreset, customStart, customEnd)

  // Parse strategy and calculate hash
  const parsedStrategy: StrategyConfig = safeJsonParse(strategyJson, [])
  const strategyHash = sha256(stringifyTradeSteps(parsedStrategy))

  // Create cache key based on filters (no symbols filter)
  const cacheKey = [
    strategyHash,
    interval,
    botId ?? 'all',
    startTime ?? 'all',
    endTime ?? 'all',
  ].join(':')

  const cache = createCache<Record<string, number>>({
    namespace: CACHE_NS.STRATEGY_STATS_SYMBOL_COUNTS,
    ttl: CACHE_TTL.STRATEGY_STATS,
  })

  return cache.get(cacheKey, async () => {
    // Find matching MarketStrategy by hash and interval
    const marketStrategy = await botDb.marketStrategy.findFirst({
      where: {
        strategyHash,
        interval,
      },
      select: {
        id: true,
      },
    })

    if (!marketStrategy) {
      return {}
    }

    // Build WHERE clause (no symbol filter)
    const whereConditions: string[] = [ '"strategyId" = $1', '"calculated" = 1' ]
    const whereParams: any[] = [ marketStrategy.id ]
    let paramIndex = 2

    if (botId) {
      whereConditions.push(`"botId" = $${paramIndex++}`)
      whereParams.push(botId)
    }

    if (startTime !== undefined) {
      whereConditions.push(`"startTime" >= $${paramIndex++}`)
      whereParams.push(startTime)
    }

    if (endTime !== undefined) {
      whereConditions.push(`"endTime" <= $${paramIndex}`)
      whereParams.push(endTime)
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`

    const query = `
      SELECT "symbol", COUNT(*)::int as "count"
      FROM "MarketStrategyProfit"
      ${whereClause}
      GROUP BY "symbol"
      ORDER BY "count" DESC
    `

    const rows = await botDb.$queryRawUnsafe<{ symbol: string, count: number }[]>(query, ...whereParams)

    const result: Record<string, number> = {}
    for (const row of rows) {
      result[row.symbol] = row.count
    }
    return result
  })
})
