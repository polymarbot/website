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
import { schemaDefinitions } from '@root/packages/layer-auth/shared/validation/schemas'

import type { InviteDbClient } from '../utils'
import {
  generateOTP,
  calculateExpiresAt,
  extractClientIP,
  verifyTurnstileAndRateLimit,
  recordRateLimitUsage,
  storeVerification,
  verifyOtpCode,
  validateInviteCode,
  recordInviteCodeUsage,
} from '../utils'
import { ERROR_CODES } from '../../../errors'

const IDENTIFIER_PREFIX = 'sign-up-otp-'

export interface EmailOtpSignupOptions {
  db: InviteDbClient & {
    $transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>
  }
  sendVerificationOTP: (data: { email: string, otp: string }) => Promise<void>
  otpLength?: number
  expiresIn?: number
  allowedAttempts?: number
}

export function emailOtpSignup (options: EmailOtpSignupOptions): BetterAuthPlugin {
  const {
    db,
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
          body: schemaDefinitions['POST /api/auth/email-otp-signup/send-otp'](),
        },
        async ctx => {
          const { email, inviteCode, turnstileToken } = ctx.body
          const identifier = `${IDENTIFIER_PREFIX}${email}`
          const clientIP = extractClientIP(ctx)

          // Security checks
          await verifyTurnstileAndRateLimit(turnstileToken, email, clientIP)
          await validateInviteCode(db, inviteCode)

          // Check if user already exists
          const existingUser = await ctx.context.internalAdapter.findUserByEmail(email)
          if (existingUser) {
            throw new APIError('BAD_REQUEST', {
              message: ERROR_CODES.AUTH_USER_ALREADY_EXISTS,
              code: ERROR_CODES.AUTH_USER_ALREADY_EXISTS,
            })
          }

          // Generate and store OTP
          const otp = generateOTP(otpLength)
          const expiresAtDate = calculateExpiresAt(expiresIn)
          await storeVerification(ctx, identifier, otp, expiresAtDate)
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
          body: schemaDefinitions['POST /api/auth/email-otp-signup/verify-otp'](),
        },
        async ctx => {
          const { email, otp, inviteCode, marketingEmails } = ctx.body
          const identifier = `${IDENTIFIER_PREFIX}${email}`

          // Re-validate invite code (in case it was exhausted)
          await validateInviteCode(db, inviteCode)

          // Verify OTP
          await verifyOtpCode(ctx, identifier, otp, otpLength, allowedAttempts)

          // Check if user already exists (race condition check)
          const existingUser = await ctx.context.internalAdapter.findUserByEmail(email)
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
              await recordInviteCodeUsage(tx, inviteCode, newUser.id)
            }

            return newUser
          })

          // Create session
          const session = await ctx.context.internalAdapter.createSession(user.id, false)
          await setSessionCookie(ctx, {
            session,
            user,
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
