/**
 * GET /api/internal/wallets
 *
 * List all active wallets that meet one of the following criteria:
 * 1. Have at least one enabled bot
 * 2. Have no enabled bots, but at least one disabled bot updated within the last 48 hours
 *
 * Returns wallet details including encrypted private keys.
 *
 * Authentication: Bearer token via Authorization header
 * External scripts need ENCRYPTION_KEY to decrypt wallet private keys.
 *
 * Cache: Results are cached until invalidated by bot enable/disable or wallet changes.
 */
export default defineWrappedResponseHandler(async event => {
  await requireInternalApiKey(event)

  const query = getCleanQuery(event)
  const { offset, limit } = validateRequestData(query, 'GET', '/api/internal/wallets')

  const cache = createCache({ namespace: CACHE_NS.INTERNAL_WALLETS })

  const recentThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000)

  // Filter: ACTIVE wallets that have enabled bots OR recently updated disabled bots
  const whereCondition = {
    status: WalletStatus.ACTIVE,
    deleted: false,
    OR: [
      // Condition 1: At least one enabled bot
      {
        bots: {
          some: {
            enabled: true,
          },
        },
      },
      // Condition 2: No enabled bots, but has disabled bots updated within 48h
      {
        AND: [
          {
            bots: {
              none: {
                enabled: true,
              },
            },
          },
          {
            bots: {
              some: {
                enabled: false,
                updatedAt: {
                  gte: recentThreshold,
                },
              },
            },
          },
        ],
      },
    ],
  }

  const [ items, total ] = await Promise.all([
    cache.get(`list:${offset}:${limit}`, () =>
      appDb.wallet.findMany({
        where: whereCondition,
        select: {
          funder: true,
          name: true,
          encryptedKey: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
    ),
    cache.get('total', () =>
      appDb.wallet.count({
        where: whereCondition,
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
