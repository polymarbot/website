/**
 * GET /api/dashboard/stats
 *
 * Get dashboard statistics for the authenticated user.
 * Returns counts of wallets, strategies, bots, and running bots.
 *
 * Optimizations:
 * - Uses a single SQL query with subqueries (1 database round-trip)
 * - Results cached for 30 seconds per user to reduce database load
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  // User-specific cache with 30s TTL
  const cache = createCache<DashboardStats>({
    namespace: `${CACHE_NS.DASHBOARD}:${user.id}`,
    ttl: CACHE_TTL.DASHBOARD_STATS,
  })

  return cache.get('stats', async () => {
    const result = await db.$queryRaw<[DashboardStats]>`
      SELECT
        (SELECT COUNT(*)::int FROM "Wallet" WHERE "ownerId" = ${user.id} AND "deleted" = false) as "walletCount",
        (SELECT COUNT(*)::int FROM "Strategy" WHERE "ownerId" = ${user.id}) as "strategyCount",
        (SELECT COUNT(*)::int FROM "Bot" b
         JOIN "Wallet" w ON b."funder" = w."funder"
         WHERE w."ownerId" = ${user.id} AND w."deleted" = false) as "botCount",
        (SELECT COUNT(*)::int FROM "Bot" b
         JOIN "Wallet" w ON b."funder" = w."funder"
         WHERE w."ownerId" = ${user.id} AND w."deleted" = false AND b."enabled" = true) as "runningBotCount"
    `
    return result[0]
  })
})
