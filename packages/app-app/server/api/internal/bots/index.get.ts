/**
 * GET /api/internal/bots
 *
 * List all enabled bots sorted by strategy maxBuySize (desc) and creation time (asc).
 * Returns encrypted private keys for external script decryption.
 *
 * Authentication: Bearer token via Authorization header
 * External scripts need ENCRYPTION_KEY to decrypt wallet private keys.
 *
 * Cache: Results are cached until invalidated by bot enable/disable or strategy update.
 */
export default defineWrappedResponseHandler(async event => {
  await requireInternalApiKey(event)

  const query = getCleanQuery(event)
  const { offset, limit, interval } = validateRequestData(query, 'GET', '/api/internal/bots')

  const cache = createCache({ namespace: CACHE_NS.INTERNAL_BOTS })

  const where = {
    enabled: true,
    wallet: {
      deleted: false,
    },
    ...(interval && { interval }),
  } as const

  // Cache key prefix: use interval value or 'all' for unfiltered queries
  const prefix = interval ?? 'all'

  const [ items, total ] = await Promise.all([
    cache.get(`${prefix}:list:${offset}:${limit}`, () =>
      appDb.bot.findMany({
        where,
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
        orderBy: [
          { strategy: { maxBuySize: 'desc' }},
          { createdAt: 'asc' },
        ],
        skip: offset,
        take: limit,
      }),
    ),
    cache.get(`${prefix}:total`, () =>
      appDb.bot.count({ where }),
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
