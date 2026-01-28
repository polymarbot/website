/**
 * POST /api/market-strategies/stats
 *
 * Get market statistics for a strategy by its strategyJson and interval.
 * Server calculates the hash from strategyJson and queries by hash.
 *
 * Body parameters:
 * - strategyJson: Strategy configuration JSON string
 * - interval: Market interval (e.g., '15m', '1h', '4h', '1d')
 * - symbols: Filter by market symbols, comma-separated (optional, e.g., "btc,eth")
 * - datePreset: Date range preset (WEEK, MONTH, QUARTER, ALL, CUSTOM)
 * - customStart: Custom start time for CUSTOM preset (unix timestamp)
 * - customEnd: Custom end time for CUSTOM preset (unix timestamp)
 *
 * Subscription permissions:
 * - FREE: No access
 * - PRO: Access to QUARTER preset only
 * - PLUS/MAX: Full access including ALL and CUSTOM
 *
 * Returns StrategyStats or null if no matching strategy found.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const body = await readBody(event)
  const { strategyJson, interval, symbols, datePreset, customStart, customEnd } = validateRequestData(body, 'POST', '/api/market-strategies/stats')

  // Validate stats access permission (throws 403 if denied)
  await validateStatsAccess(user.id, datePreset)

  // Calculate time range from preset
  const { startTime, endTime } = getTimeRangeFromPreset(datePreset, customStart, customEnd)

  // Parse strategy and calculate hash
  const parsedStrategy: StrategyConfig = safeJsonParse(strategyJson, [])
  const strategyHash = sha256(stringifyTradeSteps(parsedStrategy))

  // Create cache key based on filters
  const cacheKey = [
    strategyHash,
    interval,
    symbols ?? 'all',
    startTime ?? 'all',
    endTime ?? 'all',
  ].join(':')

  const cache = createCache<StrategyStats | null>({
    namespace: CACHE_NS.STRATEGY_STATS,
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

    // If no matching market strategy found, return null
    if (!marketStrategy) {
      return null
    }

    // Parse comma-separated symbols into array
    const symbolArray = symbols ? symbols.split(',').filter(Boolean) : undefined

    // Build WHERE clause for filtering
    const whereConditions: string[] = [ '"strategyId" = $1', '"calculated" = 1' ]
    const whereParams: any[] = [ marketStrategy.id ]
    let paramIndex = 2

    if (symbolArray && symbolArray.length > 0) {
      const placeholders = symbolArray.map((_, i) => `$${paramIndex + i}`).join(', ')
      whereConditions.push(`"symbol" IN (${placeholders})`)
      whereParams.push(...symbolArray)
      paramIndex += symbolArray.length
    }

    if (startTime !== undefined) {
      whereConditions.push(`"startTime" >= $${paramIndex++}`)
      whereParams.push(startTime)
    }

    if (endTime !== undefined) {
      whereConditions.push(`"endTime" <= $${paramIndex++}`)
      whereParams.push(endTime)
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`

    // Query statistics from MarketStrategyProfit table
    const statsQuery = `
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE "cost" > 0)::int as participated,
      COUNT(*) FILTER (WHERE "profit" > 0)::int as profitable,
      COALESCE(SUM("cost") FILTER (WHERE "cost" > 0), 0)::text as "totalCost",
      COALESCE(SUM("profit") FILTER (WHERE "cost" > 0), 0)::text as "totalProfit",
      CASE WHEN COUNT(*) > 0
        THEN COUNT(*) FILTER (WHERE "cost" > 0)::decimal / COUNT(*)::decimal
        ELSE 0
      END as "hitRate",
      CASE WHEN COUNT(*) FILTER (WHERE "cost" > 0) > 0
        THEN COUNT(*) FILTER (WHERE "profit" > 0)::decimal / COUNT(*) FILTER (WHERE "cost" > 0)::decimal
        ELSE 0
      END as "winRate",
      CASE WHEN COALESCE(SUM("cost") FILTER (WHERE "cost" > 0), 0) > 0
        THEN COALESCE(SUM("profit") FILTER (WHERE "cost" > 0), 0) / COALESCE(SUM("cost") FILTER (WHERE "cost" > 0), 1)
        ELSE 0
      END as "profitRate"
    FROM "MarketStrategyProfit"
    ${whereClause}
  `

    const results = await botDb.$queryRawUnsafe<StrategyStats[]>(statsQuery, ...whereParams)

    const stats = results[0]

    if (!stats || stats.total === 0) {
      return null
    }

    const profitRate = Number(stats.profitRate)
    const activeDays = stats.total * (INTERVAL_DAYS[interval] ?? 1)
    const apr = profitRate * (365 / activeDays)

    return {
      total: stats.total,
      participated: stats.participated,
      profitable: stats.profitable,
      totalCost: stats.totalCost,
      totalProfit: stats.totalProfit,
      apr,
      profitRate,
      winRate: Number(stats.winRate),
      hitRate: Number(stats.hitRate),
    } satisfies StrategyStats
  })
})
