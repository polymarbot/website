/**
 * GET /api/dashboard/profit-history
 *
 * Get aggregated daily profit/loss history across all user wallets.
 * Returns transaction data grouped by day, summed across all wallets.
 *
 * Query params:
 * - days: Number of days to fetch (default: 30, max: 365)
 *
 * Optimizations:
 * - Uses PostgreSQL DATE_TRUNC for efficient daily aggregation
 * - Results cached for 1 hour per user to reduce database load
 * - Single SQL query with JOIN and conditional aggregation
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const query = getQuery(event)
  const { days } = validateRequestData(query, 'GET', '/api/dashboard/profit-history')

  // User-specific cache with 1 hour TTL
  const cache = createCache<{ data: DailyProfit[] }>({
    namespace: `${CACHE_NS.DASHBOARD}:${user.id}`,
    ttl: CACHE_TTL.PROFIT_HISTORY,
  })

  return cache.get(`profit:${days}d`, async () => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Get all user wallet addresses
    const wallets = await db.wallet.findMany({
      where: {
        ownerId: user.id,
        deleted: false,
      },
      select: {
        funder: true,
      },
    })

    if (wallets.length === 0) {
      return {
        data: [],
      }
    }

    const addresses = wallets.map(w => w.funder)

    // PostgreSQL aggregation query grouped by day, across all user wallets
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
      WHERE address = ANY(${addresses})
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
