/**
 * GET /api/strategies
 *
 * List strategies for the authenticated user with pagination support.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const query = getCleanQuery(event)
  const { offset, limit, keyword, interval } = validateRequestData(query, 'GET', '/api/strategies')

  // Build where clause with optional keyword search and interval filter
  const where = {
    ownerId: user.id,
    ...(keyword && {
      name: {
        contains: keyword,
        mode: 'insensitive' as const,
      },
    }),
    ...(interval && { interval }),
  }

  const [ strategies, total ] = await Promise.all([
    appDb.strategy.findMany({
      where,
      select: {
        id: true,
        name: true,
        interval: true,
        strategyJson: true,
        amount: true,
        maxBuySize: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bots: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    appDb.strategy.count({ where }),
  ])

  return {
    items: strategies.map(strategy => ({
      id: strategy.id,
      name: strategy.name,
      interval: strategy.interval,
      strategyJson: strategy.strategyJson,
      amount: strategy.amount,
      maxBuySize: strategy.maxBuySize,
      createdAt: strategy.createdAt,
      updatedAt: strategy.updatedAt,
      botCount: strategy._count.bots,
    })),
    pagination: {
      offset,
      limit,
      total,
    },
  }
})
