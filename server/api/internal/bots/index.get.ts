/**
 * GET /api/internal/bots
 *
 * List all enabled bots sorted by creation time (desc).
 * Returns encrypted private keys for external script decryption.
 *
 * Authentication: Bearer token via Authorization header
 * External scripts need ENCRYPTION_KEY to decrypt wallet private keys.
 *
 * Cache: Results are cached until invalidated by bot enable/disable or strategy update.
 */
export default defineWrappedResponseHandler(async event => {
  await requireInternalApiKey(event)

  const query = getQuery(event)
  const { offset, limit } = validateRequestData(query, 'GET', '/api/internal/bots')

  const cache = createCache({ namespace: CACHE_NS.INTERNAL_BOTS })

  const [ items, total ] = await Promise.all([
    cache.get(`list:${offset}:${limit}`, () =>
      db.bot.findMany({
        where: {
          enabled: true,
          wallet: {
            deleted: false,
          },
        },
        select: {
          id: true,
          symbol: true,
          interval: true,
          funder: true,
          strategyId: true,
          enabled: true,
          enabledAt: true,
          totalRuntimeSeconds: true,
          createdAt: true,
          updatedAt: true,
          strategy: {
            select: {
              name: true,
              amount: true,
              strategyJson: true,
            },
          },
          wallet: {
            select: {
              name: true,
              encryptedKey: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
    ),
    cache.get('total', () =>
      db.bot.count({
        where: {
          enabled: true,
          wallet: {
            deleted: false,
          },
        },
      }),
    ),
  ])

  return {
    items,
    pagination: {
      offset,
      limit,
      total,
    },
  }
})
