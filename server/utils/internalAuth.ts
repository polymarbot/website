import type { H3Event } from 'h3'
import { timingSafeEqual } from 'node:crypto'

/**
 * Validate internal API key from Authorization header
 *
 * Expects header format: Authorization: Bearer <API_KEY>
 *
 * @param event - H3 event object
 * @throws 401 error if API key is missing or invalid
 *
 * @example
 * ```ts
 * export default defineWrappedResponseHandler(async event => {
 *   await requireInternalApiKey(event)
 *   // Authenticated, proceed with handler logic
 * })
 * ```
 */
export async function requireInternalApiKey (event: H3Event): Promise<void> {
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader) {
    throwApiError(401, ERROR_CODES.INTERNAL_API_KEY_MISSING)
  }

  // Extract token from "Bearer <token>" format
  const [ scheme, token ] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    throwApiError(401, ERROR_CODES.INTERNAL_API_KEY_INVALID)
  }

  const expectedKey = process.env.INTERNAL_API_KEY

  if (!expectedKey) {
    console.error('INTERNAL_API_KEY environment variable is not configured')
    throwApiError(500, ERROR_CODES.COMMON_SERVER_ERROR)
  }

  // Constant-time comparison to prevent timing attacks
  // timingSafeEqual requires same length buffers, so check length first
  const tokenBuffer = Buffer.from(token)
  const expectedBuffer = Buffer.from(expectedKey)

  if (tokenBuffer.length !== expectedBuffer.length || !timingSafeEqual(tokenBuffer, expectedBuffer)) {
    throwApiError(401, ERROR_CODES.INTERNAL_API_KEY_INVALID)
  }
}
