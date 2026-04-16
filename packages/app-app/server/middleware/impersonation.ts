/**
 * Server middleware to enforce read-only mode for impersonation sessions.
 *
 * Only allows GET requests, auth routes (for sign-out), and whitelisted
 * POST routes (read-like operations). All other requests are blocked
 * when the session has impersonatedBy set.
 */

// POST routes that are read-like operations and safe to allow during impersonation
const WHITELISTED_POST_ROUTES = [
  '/api/market-strategies/stats',
  '/api/strategies/check',
]

export default defineEventHandler(async event => {
  const path = event.path

  // Only intercept /api/ requests
  if (!path.startsWith('/api/')) return

  // Skip auth routes (needed for sign-out)
  if (path.startsWith('/api/auth/')) return

  // Skip GET requests (read-only)
  if (event.method === 'GET') return

  // Skip whitelisted POST routes (read-like operations)
  if (event.method === 'POST' && WHITELISTED_POST_ROUTES.some(route => path.startsWith(route))) return

  // Check session for impersonation flag
  const session = await getAuthSession(event)
  if (!session) return // No session = not impersonating, let other handlers deal with auth

  // Check if this is an impersonation session
  const impersonatedBy = (session.session as Record<string, unknown>).impersonatedBy as string | undefined
  if (!impersonatedBy) return

  // Block write operations for impersonation sessions
  const t = await getTranslations(event, 'server.errors')
  throw createError<ApiErrorData>({
    statusCode: 403,
    message: t(ERROR_CODES.IMPERSONATION_WRITE_FORBIDDEN),
    data: {
      code: ERROR_CODES.IMPERSONATION_WRITE_FORBIDDEN,
    },
  })
})
