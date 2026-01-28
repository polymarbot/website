/**
 * GET /api/bots/:id/operation-history
 *
 * Get bot operation history for a specific bot.
 * Returns paginated list of operation history with action and reason.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const id = validateRequestParams(event, 'id')
  const query = getQuery(event)
  const { offset, limit, startTime, endTime } = validateRequestData(query, 'GET', '/api/bots/[id]/operation-history')

  await validateBotOwnership(id, user.id)

  // Build where clause with optional time range filter
  const where: Record<string, any> = {
    botId: id,
    ...(startTime || endTime) && {
      createdAt: {
        ...(startTime && { gte: new Date(startTime) }),
        ...(endTime && { lte: new Date(endTime) }),
      },
    },
  }

  // Query operation history with pagination
  const [ history, total ] = await Promise.all([
    db.botOperationHistory.findMany({
      where,
      select: {
        id: true,
        action: true,
        reason: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    db.botOperationHistory.count({ where }),
  ])

  return {
    items: history,
    pagination: {
      offset,
      limit,
      total,
    },
  }
})
