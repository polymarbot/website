/**
 * GET /api/bots
 *
 * List bots for the authenticated user with pagination support.
 * Supports filtering by symbol, interval, and keyword (wallet name or strategy name).
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const query = getQuery(event)
  const validatedQuery = validateRequestData(query, 'GET', '/api/bots')
  const {
    offset,
    limit,
    keyword,
    symbols,
    intervals,
    funder,
    strategyId,
  } = validatedQuery

  // Parse comma-separated symbols and intervals
  const symbolArray = symbols ? symbols.split(',').filter(Boolean) as MarketSymbolType[] : undefined
  const intervalArray = intervals ? intervals.split(',').filter(Boolean) as MarketIntervalType[] : undefined

  // Build where clause
  const where: Prisma.BotWhereInput = {
    wallet: {
      ownerId: user.id,
      deleted: false,
    },
    ...(symbolArray && { symbol: { in: symbolArray }}),
    ...(intervalArray && { interval: { in: intervalArray }}),
    ...(funder && { funder }),
    ...(strategyId && { strategyId }),
    ...(keyword && {
      OR: [
        { wallet: { name: { contains: keyword, mode: 'insensitive' as const }}},
        { strategy: { name: { contains: keyword, mode: 'insensitive' as const }}},
      ],
    }),
  }

  const [ bots, total ] = await Promise.all([
    db.bot.findMany({
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
        wallet: {
          select: {
            name: true,
            status: true,
          },
        },
        strategy: {
          select: {
            name: true,
            amount: true,
            strategyJson: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }, // Secondary sort to ensure stable ordering
      ],
      skip: offset,
      take: limit,
    }),
    db.bot.count({ where }),
  ])

  // Query balances using multicall (single RPC call for all addresses)
  const addresses = bots.map(bot => bot.funder)
  const balances = await getUSDCBalancesBatchCached(addresses)

  // Merge balance into wallet items
  const items = bots.map((bot, index) => ({
    ...bot,
    wallet: {
      ...bot.wallet,
      balance: formatBalance(balances[index] ?? 0n),
    },
  }))

  return {
    items,
    pagination: {
      offset,
      limit,
      total,
    },
  }
})
