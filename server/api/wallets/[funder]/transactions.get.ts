/**
 * GET /api/wallets/:funder/transactions
 *
 * Get transaction history for a specific wallet.
 * Returns paginated list of wallet transactions (buy, sell, claim).
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const funder = validateRequestParams(event, 'funder')
  const query = getQuery(event)
  const { offset, limit } = validateRequestData(query, 'GET', '/api/wallets/[funder]/transactions')

  await validateWalletOwnership(funder, user.id)

  // Query transaction history with pagination
  const [ transactions, total ] = await Promise.all([
    botDb.walletTransaction.findMany({
      where: { address: funder },
      select: {
        sourceId: true,
        action: true,
        amount: true,
        timestamp: true,
        transactionHash: true,
        slug: true,
      },
      orderBy: { timestamp: 'desc' },
      skip: offset,
      take: limit,
    }),
    botDb.walletTransaction.count({ where: { address: funder }}),
  ])

  return {
    items: transactions,
    pagination: {
      offset,
      limit,
      total,
    },
  }
})
