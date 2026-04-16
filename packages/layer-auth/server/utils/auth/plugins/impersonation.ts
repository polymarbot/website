/**
 * Custom Better Auth Plugin: Impersonation (Support Login)
 *
 * Allows admin to log in as another user for debugging purposes.
 * - GET /api/auth/impersonate: Verify HMAC ticket and create impersonation session
 *
 * To stop impersonation, the client calls better-auth's built-in signOut API
 * (POST /api/auth/sign-out), which deletes the session and clears the cookie.
 */

import type { BetterAuthPlugin } from 'better-auth'
import { createAuthEndpoint } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import { APIError } from 'better-auth'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { schemaDefinitions } from '@root/packages/layer-auth/shared/validation/schemas'
import { ERROR_CODES } from '../../../errors'

const TICKET_MAX_AGE_MS = 60 * 1000 // 1 minute
const IMPERSONATION_SESSION_TTL = 60 * 60 // 1 hour in seconds

/**
 * Sign an impersonation ticket using HMAC-SHA256
 */
export function signImpersonationTicket (userId: string, secret: string): string {
  const exp = Date.now() + TICKET_MAX_AGE_MS
  const payload = `${userId}:${exp}`
  const hmac = createHmac('sha256', secret).update(payload).digest('hex')
  const ticket = Buffer.from(`${payload}:${hmac}`).toString('base64url')
  return ticket
}

/**
 * Verify an impersonation ticket
 * Returns userId if valid, throws otherwise
 */
function verifyTicket (ticket: string, secret: string): string {
  let decoded: string
  try {
    decoded = Buffer.from(ticket, 'base64url').toString('utf-8')
  } catch {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.IMPERSONATION_INVALID_TICKET,
      code: ERROR_CODES.IMPERSONATION_INVALID_TICKET,
    })
  }

  const parts = decoded.split(':')
  if (parts.length !== 3) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.IMPERSONATION_INVALID_TICKET,
      code: ERROR_CODES.IMPERSONATION_INVALID_TICKET,
    })
  }

  const userId = parts[0]!
  const expStr = parts[1]!
  const signature = parts[2]!
  const exp = Number(expStr)

  if (!userId || Number.isNaN(exp)) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.IMPERSONATION_INVALID_TICKET,
      code: ERROR_CODES.IMPERSONATION_INVALID_TICKET,
    })
  }

  // Check expiration
  if (Date.now() > exp) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.IMPERSONATION_TICKET_EXPIRED,
      code: ERROR_CODES.IMPERSONATION_TICKET_EXPIRED,
    })
  }

  // Verify HMAC signature (timing-safe)
  const payload = `${userId}:${expStr}`
  const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex')

  const sigBuffer = Buffer.from(signature, 'utf-8')
  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8')

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.IMPERSONATION_INVALID_TICKET,
      code: ERROR_CODES.IMPERSONATION_INVALID_TICKET,
    })
  }

  return userId
}

export function impersonation (): BetterAuthPlugin {
  return {
    id: 'impersonation',

    endpoints: {
      impersonate: createAuthEndpoint(
        '/impersonate',
        {
          method: 'GET',
          query: schemaDefinitions['GET /api/auth/impersonate'](),
        },
        async ctx => {
          const secret = ctx.context.secret
          const { ticket } = ctx.query

          // Verify ticket
          const targetUserId = verifyTicket(ticket, secret)

          // Verify target user exists
          const user = await ctx.context.internalAdapter.findUserById(targetUserId)
          if (!user) {
            throw new APIError('BAD_REQUEST', {
              message: ERROR_CODES.IMPERSONATION_USER_NOT_FOUND,
              code: ERROR_CODES.IMPERSONATION_USER_NOT_FOUND,
            })
          }

          // Create session for target user
          const session = await ctx.context.internalAdapter.createSession(targetUserId, false)

          // Update session with impersonatedBy and shorter expiry
          const expiresAt = new Date(Date.now() + IMPERSONATION_SESSION_TTL * 1000)
          await ctx.context.internalAdapter.updateSession(session.token, {
            impersonatedBy: 'support',
            expiresAt,
          })

          // Set signed session cookie (include impersonatedBy so cookie cache has it)
          await setSessionCookie(ctx, {
            session: { ...session, expiresAt, impersonatedBy: 'support' },
            user,
          }, false)

          // Redirect to dashboard
          throw ctx.redirect('/dashboard')
        },
      ),
    },
  }
}
