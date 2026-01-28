/**
 * GET /api/bots/counts
 *
 * Get bot counts grouped by market (symbol + interval) for the authenticated user.
 * Returns an object with market keys (e.g., "btc-15m") and their enabled/total bot counts.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const walletFilter = {
    wallet: {
      ownerId: user.id,
      deleted: false,
    },
  }

  // Run two groupBy queries in parallel for efficiency
  const [ totalCounts, enabledCounts ] = await Promise.all([
    // Query 1: Get total bot counts grouped by symbol and interval
    db.bot.groupBy({
      by: [ 'symbol', 'interval' ],
      where: walletFilter,
      _count: { _all: true },
    }),
    // Query 2: Get enabled bot counts grouped by symbol and interval
    db.bot.groupBy({
      by: [ 'symbol', 'interval' ],
      where: { ...walletFilter, enabled: true },
      _count: { _all: true },
    }),
  ])

  // Build enabled counts map for quick lookup
  const enabledMap = new Map<string, number>()
  for (const item of enabledCounts) {
    enabledMap.set(`${item.symbol}-${item.interval}`, item._count._all)
  }

  // Merge results into final response
  const counts: Record<string, BotCountItem> = {}
  for (const item of totalCounts) {
    const key = `${item.symbol}-${item.interval}`
    counts[key] = {
      enabled: enabledMap.get(key) ?? 0,
      total: item._count._all,
    }
  }

  return counts
})
