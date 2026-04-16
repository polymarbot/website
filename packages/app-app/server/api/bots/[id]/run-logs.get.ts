/**
 * GET /api/bots/:id/run-logs
 *
 * Get bot execution logs from the bot_logs database.
 * Uses compound cursor-based pagination (createdAt + id) for correct ordering.
 * Supports bidirectional loading: backward (older) and forward (newer).
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const id = validateRequestParams(event, 'id')
  const query = getCleanQuery(event)
  const { cursor, limit, direction, startTime, endTime } = validateRequestData(query, 'GET', '/api/bots/[id]/run-logs')

  await validateBotOwnership(id, user.id)

  const isBackward = direction === 'backward'
  const sortOrder = isBackward ? 'desc' : 'asc' as const

  // Parse compound cursor: "id,timestamp"
  let cursorId: number | undefined
  let cursorTime: Date | undefined
  if (cursor) {
    const [ idStr, timeStr ] = cursor.split(',')
    cursorId = Number(idStr)
    cursorTime = new Date(Number(timeStr))
  }

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

  // Build compound cursor condition (inclusive: cursor item is included in results)
  const where = (cursorId != null && cursorTime)
    ? {
      ...baseWhere,
      OR: [
        { createdAt: isBackward ? { lt: cursorTime } : { gt: cursorTime }},
        { createdAt: cursorTime, id: isBackward ? { lte: cursorId } : { gte: cursorId }},
      ],
    }
    : baseWhere

  // Only count total on first page (no cursor) to avoid expensive full scans
  const isFirstPage = !cursor

  const logsPromise = botLogsDb.botLog.findMany({
    where,
    select: {
      id: true,
      level: true,
      message: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: sortOrder }, { id: sortOrder }],
    take: limit + 1, // Fetch one extra to check hasNext
  })

  const [ logs, total ] = await Promise.all([
    logsPromise,
    isFirstPage ? botLogsDb.botLog.count({ where: baseWhere }) : Promise.resolve(undefined),
  ])

  // Determine if there's a next page (extra item becomes the next cursor)
  const hasMore = logs.length > limit
  const items = hasMore ? logs.slice(0, limit) : logs
  const next = hasMore
    ? `${logs[limit]!.id},${logs[limit]!.createdAt.getTime()}`
    : undefined

  return {
    items,
    pagination: {
      total,
      next,
    },
  }
})
