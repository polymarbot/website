/**
 * GET /api/bots/:id/run-logs
 *
 * Get bot execution logs from the bot_logs database.
 * Uses cursor-based pagination for efficient data loading.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const id = validateRequestParams(event, 'id')
  const query = getQuery(event)
  const { cursor, limit, startTime, endTime } = validateRequestData(query, 'GET', '/api/bots/[id]/run-logs')

  await validateBotOwnership(id, user.id)

  // Build base where clause with time range filter
  const baseWhere: Record<string, any> = {
    botId: id,
    level: { not: 'debug' },
    ...(startTime || endTime) && {
      createdAt: {
        ...(startTime && { gte: new Date(startTime) }),
        ...(endTime && { lte: new Date(endTime) }),
      },
    },
  }

  // Add cursor filter for pagination query
  const where = cursor ? { ...baseWhere, id: { lt: cursor }} : baseWhere

  // Fetch one extra item to determine if there's a next page
  const [ logs, total ] = await Promise.all([
    botLogsDb.botLog.findMany({
      where,
      select: {
        id: true,
        level: true,
        message: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1, // Fetch one extra to check hasNext
    }),
    botLogsDb.botLog.count({ where: baseWhere }),
  ])

  // Determine if there's a next page
  const hasNext = logs.length > limit
  const items = hasNext ? logs.slice(0, limit) : logs
  const next = hasNext ? items[items.length - 1]?.id : undefined

  return {
    items,
    pagination: {
      total,
      hasNext,
      next,
    },
  }
})
