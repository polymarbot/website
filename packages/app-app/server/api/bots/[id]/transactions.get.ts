/**
 * GET /api/bots/:id/transactions
 *
 * Get transaction history for a specific bot.
 * Returns paginated list of wallet transactions filtered by botId.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const id = validateRequestParams(event, 'id')
  const query = getCleanQuery(event)
  const { offset, limit } = validateRequestData(query, 'GET', '/api/bots/[id]/transactions')

  await validateBotOwnership(id, user.id)

  // Query transaction history with pagination
  const [ transactions, total ] = await Promise.all([
    botDb.walletTransaction.findMany({
      where: { botId: id },
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
    botDb.walletTransaction.count({ where: { botId: id }}),
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
