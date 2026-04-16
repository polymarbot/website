/**
 * GET /api/bots/:id/profit-history
 *
 * Get daily profit/loss history for a specific bot.
 * Returns aggregated transaction data grouped by day.
 *
 * Query params:
 * - days: Number of days to fetch (default: 30, max: 365)
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const id = validateRequestParams(event, 'id')
  const query = getCleanQuery(event)
  const { days } = validateRequestData(query, 'GET', '/api/bots/[id]/profit-history')
  const tz = normalizeTimezone(getHeader(event, 'x-timezone'))

  await validateBotOwnership(id, user.id)

  // Bot-specific cache with profit history TTL
  const cache = createCache<{ data: DailyProfit[] }>({
    namespace: `${CACHE_NS.BOT}:${id}`,
    ttl: CACHE_TTL.PROFIT_HISTORY,
  })

  return cache.get(`profit-history:${days}d:${tz.replace('/', '_')}`, async () => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // PostgreSQL aggregation query grouped by day in user's timezone
    const results = await botDb.$queryRaw<
      Array<{
        date: Date
        netProfit: Decimal
        buyAmount: Decimal
        sellAmount: Decimal
        claimAmount: Decimal
        txCount: bigint
      }>
    >`
      SELECT
        DATE_TRUNC('day', timestamp AT TIME ZONE ${tz}) as date,
        SUM(amount) as "netProfit",
        SUM(CASE WHEN action = 'BUY' THEN amount ELSE 0 END) as "buyAmount",
        SUM(CASE WHEN action = 'SELL' THEN amount ELSE 0 END) as "sellAmount",
        SUM(CASE WHEN action = 'CLAIM' THEN amount ELSE 0 END) as "claimAmount",
        COUNT(*) as "txCount"
      FROM "WalletTransaction"
      WHERE "botId" = ${id}
        AND timestamp >= ${startDate}
      GROUP BY 1
      ORDER BY date ASC
    `

    // Format response data
    return {
      data: results.map(row => ({
        date: row.date.toISOString(),
        netProfit: row.netProfit.toString(),
        buyAmount: row.buyAmount.toString(),
        sellAmount: row.sellAmount.toString(),
        claimAmount: row.claimAmount.toString(),
        txCount: Number(row.txCount),
      })),
    }
  })
})
