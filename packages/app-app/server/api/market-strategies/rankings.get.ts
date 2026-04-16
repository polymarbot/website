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
 * - symbols: Filter by market symbols (comma-separated, e.g., 'btc,eth')
 * - intervals: Filter by intervals (comma-separated, e.g., '1h,4h,1d')
 * - minBuySize: Minimum strategy buy size (optional, user-specified)
 * - maxBuySize: Maximum strategy buy size (clamped to user's plan limit)
 * - minRecordCount: Minimum record count for statistical significance (default: 10)
 * - minParticipatedCount: Minimum participated count filter (default: 0)
 *
 * Subscription permissions:
 * - FREE: No access
 * - PRO: Access to QUARTER preset only, minRecordCount forced to 10, minParticipatedCount forced to 0
 * - PLUS/MAX: Full access including ALL and CUSTOM, can customize minRecordCount and minParticipatedCount
 *
 * Data filtering:
 * - Only includes records with calculated = 1 (excludes uncalculated/invalid markets)
 *
 * Rankings:
 * - APR: profitRate * (365 / activeDays) - filters out total < minRecordCount and participated < minParticipatedCount
 * - Profit Rate: totalProfit / totalCost - filters out total < minRecordCount and participated < minParticipatedCount
 * - Win Rate: profitable / participated (profit > 0 / cost > 0) - filters out total < minRecordCount and participated < minParticipatedCount
 * - Hit Rate: participated / total (cost > 0 / all valid records) - filters out total < minRecordCount and participated < minParticipatedCount
 */

export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const query = getCleanQuery(event)
  const { datePreset, customStart, customEnd, symbols, intervals, minBuySize, maxBuySize, minRecordCount: rawMinRecordCount, minParticipatedCount: rawMinParticipatedCount } = validateRequestData(query, 'GET', '/api/market-strategies/rankings')

  // Validate stats access permission (throws 403 if denied)
  await validateStatsAccess(user.id, datePreset)

  // Clamp maxBuySize to plan limit (user can set lower, but not higher)
  const ctx = createSubscriptionContext(user.id)
  const limits = await getUserLimits(user.id, ctx)
  const planMaxBuySize = limits.maxBuySize
  const effectiveMaxBuySize = planMaxBuySize === null
    ? maxBuySize // MAX plan: no upper limit, use client value as-is
    : maxBuySize !== undefined
      ? Math.min(maxBuySize, planMaxBuySize) // Clamp to plan limit
      : planMaxBuySize // No client value: default to plan limit

  // Non-PLUS users: force minRecordCount and minParticipatedCount to defaults
  const subscription = await getUserSubscription(user.id, ctx)
  const isPlusOrAbove = getPlanIndex(subscription.plan) >= getPlanIndex(SubscriptionPlan.PLUS)
  const minRecordCount = isPlusOrAbove ? rawMinRecordCount : Math.min(rawMinRecordCount, 10)
  const minParticipatedCount = isPlusOrAbove ? rawMinParticipatedCount : 0

  // Calculate time range from preset
  const { startTime, endTime } = getTimeRangeFromPreset(datePreset, customStart, customEnd)

  // Create cache key based on filters
  const cacheKey = [
    startTime ?? 'all',
    endTime ?? 'all',
    symbols ?? 'all',
    intervals ?? 'all',
    minBuySize ?? 'all',
    effectiveMaxBuySize ?? 'all',
    minRecordCount,
    minParticipatedCount,
  ].join(':')

  const cache = createCache<RankingsResponse>({
    namespace: CACHE_NS.STRATEGY_RANKINGS,
    ttl: CACHE_TTL.STRATEGY_RANKINGS,
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

    if (symbols) {
      const symbolList = symbols.split(',').filter(Boolean)
      if (symbolList.length === 1) {
        whereConditions.push(`msp."symbol" = $${paramIndex++}`)
        whereParams.push(symbolList[0])
      } else if (symbolList.length > 1) {
        const placeholders = symbolList.map(() => `$${paramIndex++}`).join(', ')
        whereConditions.push(`msp."symbol" IN (${placeholders})`)
        whereParams.push(...symbolList)
      }
    }

    if (intervals) {
      const intervalList = intervals.split(',').filter(Boolean)
      if (intervalList.length === 1) {
        whereConditions.push(`msp."interval" = $${paramIndex++}`)
        whereParams.push(intervalList[0])
      } else if (intervalList.length > 1) {
        const placeholders = intervalList.map(() => `$${paramIndex++}`).join(', ')
        whereConditions.push(`msp."interval" IN (${placeholders})`)
        whereParams.push(...intervalList)
      }
    }

    if (minBuySize !== undefined) {
      whereConditions.push(`ms."maxBuySize" >= $${paramIndex++}`)
      whereParams.push(minBuySize)
    }

    if (effectiveMaxBuySize !== undefined) {
      whereConditions.push(`ms."maxBuySize" <= $${paramIndex++}`)
      whereParams.push(effectiveMaxBuySize)
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
    const filterByCount = (item: StrategyRanking) =>
      item.total >= minRecordCount && item.participated >= minParticipatedCount

    const aprRankings = allStats
      .filter(filterByCount)
      .toSorted((a, b) => b.apr - a.apr)
      .slice(0, 10)
    const profitRateRankings = allStats
      .filter(filterByCount)
      .toSorted((a, b) => b.profitRate - a.profitRate)
      .slice(0, 10)
    const winRateRankings = allStats
      .filter(filterByCount)
      .toSorted((a, b) => b.winRate - a.winRate)
      .slice(0, 10)
    const hitRateRankings = allStats
      .filter(filterByCount)
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
