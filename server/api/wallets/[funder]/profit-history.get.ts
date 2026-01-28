/**
 * GET /api/wallets/:funder/profit-history
 *
 * Get daily profit/loss history for a specific wallet.
 * Returns aggregated transaction data grouped by day.
 *
 * Query params:
 * - days: Number of days to fetch (default: 30, max: 365)
 *
 * Optimizations:
 * - Uses PostgreSQL DATE_TRUNC for efficient daily aggregation
 * - Results cached for 1 hour to reduce database load
 * - Single SQL query with conditional aggregation
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const funder = validateRequestParams(event, 'funder')
  const query = getQuery(event)
  const { days } = validateRequestData(query, 'GET', '/api/wallets/[funder]/profit-history')

  await validateWalletOwnership(funder, user.id)

  // User-specific cache with 1 hour TTL
  const cache = createCache<{ data: DailyProfit[] }>({
    namespace: `${CACHE_NS.WALLET_PROFIT}:${funder}`,
    ttl: CACHE_TTL.PROFIT_HISTORY,
  })

  return cache.get(`${days}d`, async () => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // PostgreSQL aggregation query grouped by day
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
        DATE_TRUNC('day', timestamp) as date,
        SUM(amount) as "netProfit",
        SUM(CASE WHEN action = 'BUY' THEN amount ELSE 0 END) as "buyAmount",
        SUM(CASE WHEN action = 'SELL' THEN amount ELSE 0 END) as "sellAmount",
        SUM(CASE WHEN action = 'CLAIM' THEN amount ELSE 0 END) as "claimAmount",
        COUNT(*) as "txCount"
      FROM "WalletTransaction"
      WHERE address = ${funder}
        AND timestamp >= ${startDate}
      GROUP BY DATE_TRUNC('day', timestamp)
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
