/**
 * Custom Better Auth Plugin: Email OTP Sign In
 *
 * Handles email OTP-based login with:
 * - Cloudflare Turnstile bot protection
 * - Fine-grained rate limiting (per-email and per-IP)
 * - Brute-force protection with attempt limiting
 */

import type { BetterAuthPlugin } from 'better-auth'
import { createAuthEndpoint } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import { APIError } from 'better-auth'
import { createApiValidationSchema } from '#shared/validation/schemas'

import { db } from '../../db'
import {
  generateOTP,
  calculateExpiresAt,
  extractClientIP,
  verifyTurnstileAndRateLimit,
  recordRateLimitUsage,
  storeVerification,
  verifyOtpCode,
} from '../utils'
import { ERROR_CODES } from '../../../errors'

const IDENTIFIER_PREFIX = 'sign-in-otp-'

export interface EmailOtpSigninOptions {
  sendVerificationOTP: (data: { email: string, otp: string }) => Promise<void>
  otpLength?: number
  expiresIn?: number
  allowedAttempts?: number
}

export function emailOtpSignin (options: EmailOtpSigninOptions): BetterAuthPlugin {
  const {
    sendVerificationOTP,
    otpLength = 6,
    expiresIn = 300,
    allowedAttempts = 3,
  } = options

  return {
    id: 'email-otp-signin',

    endpoints: {
      sendSigninOtp: createAuthEndpoint(
        '/email-otp-signin/send-otp',
        {
          method: 'POST',
          body: createApiValidationSchema('POST', '/api/auth/email-otp-signin/send-otp'),
        },
        async ctx => {
          const { email, turnstileToken } = ctx.body
          const identifier = `${IDENTIFIER_PREFIX}${email}`
          const clientIP = extractClientIP(ctx)

          // Security checks
          await verifyTurnstileAndRateLimit(turnstileToken, email, clientIP)

          // Check if user exists
          const user = await db.user.findUnique({ where: { email }})
          if (!user) {
            throw new APIError('BAD_REQUEST', {
              message: ERROR_CODES.AUTH_USER_NOT_FOUND,
              code: ERROR_CODES.AUTH_USER_NOT_FOUND,
            })
          }

          // Generate and store OTP
          const otp = generateOTP(otpLength)
          const expiresAt = calculateExpiresAt(expiresIn)
          await storeVerification(identifier, otp, expiresAt)
          await recordRateLimitUsage(email, clientIP)

          // Send verification email
          await sendVerificationOTP({ email, otp })

          return ctx.json({ success: true })
        },
      ),

      verifySigninOtp: createAuthEndpoint(
        '/email-otp-signin/verify-otp',
        {
          method: 'POST',
          body: createApiValidationSchema('POST', '/api/auth/email-otp-signin/verify-otp'),
        },
        async ctx => {
          const { email, otp } = ctx.body
          const identifier = `${IDENTIFIER_PREFIX}${email}`

          // Verify OTP
          await verifyOtpCode(identifier, otp, otpLength, allowedAttempts)

          // Get user
          const user = await db.user.findUnique({ where: { email }})
          if (!user) {
            throw new APIError('BAD_REQUEST', {
              message: ERROR_CODES.AUTH_USER_NOT_FOUND,
              code: ERROR_CODES.AUTH_USER_NOT_FOUND,
            })
          }

          // Create session
          const session = await ctx.context.internalAdapter.createSession(user.id, false)
          await setSessionCookie(ctx, {
            session,
            user: { ...user, name: user.name ?? '' },
          }, false)

          return ctx.json({
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
            },
          })
        },
      ),
    },
  }
}
