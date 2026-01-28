/**
 * Custom Better Auth Plugin: Email OTP Sign Up
 *
 * Handles email OTP-based registration with:
 * - Cloudflare Turnstile bot protection
 * - Fine-grained rate limiting (per-email and per-IP)
 * - Invite code validation
 * - Terms acceptance (marketing emails opt-in)
 * - Brute-force protection with attempt limiting
 */

import type { BetterAuthPlugin } from 'better-auth'
import { createAuthEndpoint } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import { APIError } from 'better-auth'
import { createApiValidationSchema } from '#shared/validation/schemas'

import { db } from '../../db'
import { extractNameFromEmail } from '../../email'
import { validateInviteCode, recordInviteCodeUsage } from '../index'
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

const IDENTIFIER_PREFIX = 'sign-up-otp-'

export interface EmailOtpSignupOptions {
  sendVerificationOTP: (data: { email: string, otp: string }) => Promise<void>
  otpLength?: number
  expiresIn?: number
  allowedAttempts?: number
}

export function emailOtpSignup (options: EmailOtpSignupOptions): BetterAuthPlugin {
  const {
    sendVerificationOTP,
    otpLength = 6,
    expiresIn = 300,
    allowedAttempts = 3,
  } = options

  return {
    id: 'email-otp-signup',

    endpoints: {
      sendSignupOtp: createAuthEndpoint(
        '/email-otp-signup/send-otp',
        {
          method: 'POST',
          body: createApiValidationSchema('POST', '/api/auth/email-otp-signup/send-otp'),
        },
        async ctx => {
          const { email, inviteCode, turnstileToken } = ctx.body
          const identifier = `${IDENTIFIER_PREFIX}${email}`
          const clientIP = extractClientIP(ctx)

          // Security checks
          await verifyTurnstileAndRateLimit(turnstileToken, email, clientIP)
          await validateInviteCode(inviteCode)

          // Check if user already exists
          const existingUser = await db.user.findUnique({ where: { email }})
          if (existingUser) {
            throw new APIError('BAD_REQUEST', {
              message: ERROR_CODES.AUTH_USER_ALREADY_EXISTS,
              code: ERROR_CODES.AUTH_USER_ALREADY_EXISTS,
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

      verifySignupOtp: createAuthEndpoint(
        '/email-otp-signup/verify-otp',
        {
          method: 'POST',
          body: createApiValidationSchema('POST', '/api/auth/email-otp-signup/verify-otp'),
        },
        async ctx => {
          const { email, otp, inviteCode, marketingEmails } = ctx.body
          const identifier = `${IDENTIFIER_PREFIX}${email}`

          // Re-validate invite code (in case it was exhausted)
          await validateInviteCode(inviteCode)

          // Verify OTP
          await verifyOtpCode(identifier, otp, otpLength, allowedAttempts)

          // Check if user already exists (race condition check)
          const existingUser = await db.user.findUnique({ where: { email }})
          if (existingUser) {
            throw new APIError('BAD_REQUEST', {
              message: ERROR_CODES.AUTH_USER_ALREADY_EXISTS,
              code: ERROR_CODES.AUTH_USER_ALREADY_EXISTS,
            })
          }

          // Create user with settings and invite record
          const user = await db.$transaction(async tx => {
            const newUser = await tx.user.create({
              data: {
                email,
                name: extractNameFromEmail(email),
                emailVerified: true,
              },
            })

            await tx.account.create({
              data: {
                userId: newUser.id,
                accountId: newUser.id,
                providerId: 'email-otp',
              },
            })

            await tx.userSettings.create({
              data: {
                userId: newUser.id,
                marketingEmails,
              },
            })

            if (inviteCode) {
              await recordInviteCodeUsage(inviteCode, newUser.id, tx)
            }

            return newUser
          })

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
