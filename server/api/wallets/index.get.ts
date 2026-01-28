/**
 * GET /api/wallets
 *
 * List wallets for the authenticated user with pagination support.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const query = getQuery(event)
  const validatedQuery = validateRequestData(query, 'GET', '/api/wallets')
  const {
    offset,
    limit,
    keyword,
    status,
    'botFilters.symbol': botSymbol,
    'botFilters.interval': botInterval,
    'botFilters.exclude': botExclude,
    'walletFilters.funders': walletFunders,
    'walletFilters.exclude': walletExclude,
  } = validatedQuery

  // Build bot relation filter using Prisma's relation queries (single query, more efficient)
  let botRelationFilter: Prisma.WalletWhereInput | undefined
  if (botSymbol || botInterval) {
    const symbols = botSymbol?.split(',').map(s => s.trim()).filter(Boolean)
    const intervals = botInterval?.split(',').map(i => i.trim()).filter(Boolean)

    const botCondition: Prisma.BotWhereInput = {
      ...(symbols?.length && { symbol: { in: symbols }}),
      ...(intervals?.length && { interval: { in: intervals }}),
    }

    if (botExclude) {
      // Exclude wallets that have matching bots
      botRelationFilter = {
        NOT: {
          bots: { some: botCondition },
        },
      }
    } else {
      // Include only wallets that have matching bots
      botRelationFilter = {
        bots: { some: botCondition },
      }
    }
  }

  // Build wallet funder filter
  let walletFunderFilter: Prisma.WalletWhereInput | undefined
  if (walletFunders) {
    const funders = walletFunders.split(',').map(f => f.trim()).filter(Boolean)
    if (funders.length) {
      if (walletExclude) {
        // Exclude specified funders
        walletFunderFilter = {
          funder: { notIn: funders },
        }
      } else {
        // Include only specified funders
        walletFunderFilter = {
          funder: { in: funders },
        }
      }
    }
  }

  // Build where clause with optional keyword search and status filter
  const where: Prisma.WalletWhereInput = {
    ownerId: user.id,
    deleted: false,
    ...(keyword && {
      name: {
        contains: keyword,
        mode: 'insensitive' as const,
      },
    }),
    ...(status && { status }),
    ...botRelationFilter,
    ...walletFunderFilter,
  }

  const [ wallets, total ] = await Promise.all([
    db.wallet.findMany({
      where,
      select: {
        funder: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    db.wallet.count({ where }),
  ])

  // Query balances using multicall (single RPC call for all addresses)
  const addresses = wallets.map(wallet => wallet.funder)
  const balances = await getUSDCBalancesBatchCached(addresses)

  // Merge balance into wallet items
  const items = wallets.map((wallet, index) => ({
    ...wallet,
    balance: formatBalance(balances[index] ?? 0n),
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
