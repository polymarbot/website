import type { H3Event } from 'h3'

/**
 * Get current session from request headers
 * Returns null if no valid session exists
 */
export async function getAuthSession (event: H3Event) {
  const session = await auth.api.getSession({
    headers: event.headers,
  })

  return session
}

/**
 * Require authenticated session
 * Throws 401 error if no valid session exists
 */
export async function requireAuthSession (event: H3Event) {
  const session = await getAuthSession(event)

  if (!session) {
    throwApiError(401, ERROR_CODES.COMMON_UNAUTHORIZED_ERROR)
  }

  return session
}
