/**
 * GET /api/market-strategies/rankings
 *
 * Get market strategy rankings from bot_db based on win rate and profit rate.
 * Returns top 10 strategies for each ranking type.
 *
 * Query parameters:
 * - datePreset: Date range preset (WEEK, MONTH, QUARTER, ALL, CUSTOM)
 * - customStart: Custom start time for CUSTOM preset (unix timestamp)
 * - customEnd: Custom end time for CUSTOM preset (unix timestamp)
 * - symbol: Filter by market symbol
 * - interval: Filter by interval (e.g., '1h', '4h', '1d')
 * - minAmount: Minimum strategy amount
 * - maxAmount: Maximum strategy amount
 * - minBaseCount: Minimum base count for statistical significance (default: 10)
 *
 * Subscription permissions:
 * - FREE: No access
 * - PRO: Access to QUARTER preset only
 * - PLUS/MAX: Full access including ALL and CUSTOM
 *
 * Data filtering:
 * - Only includes records with calculated = 1 (excludes uncalculated/invalid markets)
 *
 * Rankings:
 * - APR: profitRate * (365 / activeDays) - filters out participated < minBaseCount
 * - Profit Rate: totalProfit / totalCost - filters out participated < minBaseCount
 * - Win Rate: profitable / participated (profit > 0 / cost > 0) - filters out participated < minBaseCount
 * - Hit Rate: participated / total (cost > 0 / all valid records) - filters out total < minBaseCount
 */

export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const query = getQuery(event)
  const { datePreset, customStart, customEnd, symbol, interval, minAmount, maxAmount, minBaseCount } = validateRequestData(query, 'GET', '/api/market-strategies/rankings')

  // Validate stats access permission (throws 403 if denied)
  await validateStatsAccess(user.id, datePreset)

  // Calculate time range from preset
  const { startTime, endTime } = getTimeRangeFromPreset(datePreset, customStart, customEnd)

  // Create cache key based on filters
  const cacheKey = [
    startTime ?? 'all',
    endTime ?? 'all',
    symbol ?? 'all',
    interval ?? 'all',
    minAmount ?? 'all',
    maxAmount ?? 'all',
    minBaseCount,
  ].join(':')

  const cache = createCache<RankingsResponse>({
    namespace: CACHE_NS.BOT_RANKINGS,
    ttl: CACHE_TTL.BOT_RANKINGS,
  })

  return cache.get(cacheKey, async () => {
    // Build WHERE clause for filtering
    const whereConditions: string[] = []
    const whereParams: any[] = []
    let paramIndex = 1

    if (startTime !== undefined) {
      whereConditions.push(`"startTime" >= $${paramIndex++}`)
      whereParams.push(startTime)
    }

    if (endTime !== undefined) {
      whereConditions.push(`"endTime" <= $${paramIndex++}`)
      whereParams.push(endTime)
    }

    if (symbol) {
      const symbols = symbol.split(',').filter(Boolean)
      if (symbols.length === 1) {
        whereConditions.push(`msp."symbol" = $${paramIndex++}`)
        whereParams.push(symbols[0])
      } else if (symbols.length > 1) {
        const placeholders = symbols.map(() => `$${paramIndex++}`).join(', ')
        whereConditions.push(`msp."symbol" IN (${placeholders})`)
        whereParams.push(...symbols)
      }
    }

    if (interval) {
      const intervals = interval.split(',').filter(Boolean)
      if (intervals.length === 1) {
        whereConditions.push(`msp."interval" = $${paramIndex++}`)
        whereParams.push(intervals[0])
      } else if (intervals.length > 1) {
        const placeholders = intervals.map(() => `$${paramIndex++}`).join(', ')
        whereConditions.push(`msp."interval" IN (${placeholders})`)
        whereParams.push(...intervals)
      }
    }

    if (minAmount !== undefined) {
      whereConditions.push(`ms."amount" >= $${paramIndex++}`)
      whereParams.push(minAmount)
    }

    if (maxAmount !== undefined) {
      whereConditions.push(`ms."amount" <= $${paramIndex++}`)
      whereParams.push(maxAmount)
    }

    // Always exclude uncalculated records (calculated = 0)
    const baseConditions = [ 'msp."calculated" = 1' ]
    const allConditions = [ ...baseConditions, ...whereConditions ]
    const whereClause = `WHERE ${allConditions.join(' AND ')}`

    // Query to calculate statistics for each strategy
    const statsQuery = `
      WITH strategy_stats AS (
        SELECT
          msp."strategyId",
          ms."strategyJson",
          ms."interval",
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE msp."cost" > 0)::int as participated,
          COUNT(*) FILTER (WHERE msp."profit" > 0)::int as profitable,
          COALESCE(SUM(msp."cost") FILTER (WHERE msp."cost" > 0), 0) as "totalCost",
          COALESCE(SUM(msp."profit") FILTER (WHERE msp."cost" > 0), 0) as "totalProfit"
        FROM "MarketStrategyProfit" msp
        JOIN "MarketStrategy" ms ON msp."strategyId" = ms.id
        ${whereClause}
        GROUP BY msp."strategyId", ms."strategyJson", ms."interval"
      )
      SELECT
        "strategyId",
        "strategyJson",
        interval,
        total,
        participated,
        profitable,
        "totalCost"::text,
        "totalProfit"::text,
        CASE WHEN total > 0 THEN participated::decimal / total::decimal ELSE 0 END as "hitRate",
        CASE WHEN participated > 0 THEN profitable::decimal / participated::decimal ELSE 0 END as "winRate",
        CASE WHEN "totalCost" > 0 THEN "totalProfit" / "totalCost" ELSE 0 END as "profitRate"
      FROM strategy_stats
    `

    const rawStats = await botDb.$queryRawUnsafe<Omit<StrategyRanking, 'apr'>[]>(
      statsQuery,
      ...whereParams,
    )

    // Calculate APR for each strategy
    const allStats: StrategyRanking[] = rawStats.map(item => ({
      ...item,
      apr: item.profitRate * (365 / (item.total * (INTERVAL_DAYS[item.interval] ?? 1))),
    }))

    // Filter and sort to get top 10 for each ranking type
    // Each ranking type has different filtering requirements based on statistical significance
    const aprRankings = allStats
      .filter(item => item.participated >= minBaseCount)
      .toSorted((a, b) => b.apr - a.apr)
      .slice(0, 10)
    const profitRateRankings = allStats
      .filter(item => item.participated >= minBaseCount)
      .toSorted((a, b) => b.profitRate - a.profitRate)
      .slice(0, 10)
    const winRateRankings = allStats
      .filter(item => item.participated >= minBaseCount)
      .toSorted((a, b) => b.winRate - a.winRate)
      .slice(0, 10)
    const hitRateRankings = allStats
      .filter(item => item.total >= minBaseCount)
      .toSorted((a, b) => b.hitRate - a.hitRate)
      .slice(0, 10)

    return {
      aprRankings,
      profitRateRankings,
      winRateRankings,
      hitRateRankings,
    }
  })
})
