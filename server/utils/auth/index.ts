import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { APIError, getOAuthState } from 'better-auth/api'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../db'
import { sendVerificationEmail } from '../email'
import { emailOtpSignup } from './plugins/emailOtpSignup'
import { emailOtpSignin } from './plugins/emailOtpSignin'
import { ERROR_CODES } from '../../errors'

// ============================================================================
// OTP Configuration (shared between emailOTP and emailOtpSignup plugins)
// ============================================================================

const OTP_CONFIG = {
  /** Length of the OTP code */
  otpLength: 6,
  /** OTP expiration time in seconds (10 minutes) */
  expiresIn: 600,
  /** Maximum verification attempts before invalidating */
  allowedAttempts: 3,
}

// ============================================================================
// Auth Utilities
// ============================================================================

/**
 * Check if invite code is required based on environment variable
 */
export function isInviteCodeRequired (): boolean {
  return process.env.INVITE_CODE_REQUIRED === 'true'
}

/**
 * Validate invite code existence and availability
 * Throws APIError if validation fails
 */
export async function validateInviteCode (inviteCode?: string): Promise<void> {
  if (isInviteCodeRequired() && !inviteCode) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.INVITE_CODE_REQUIRED,
      code: ERROR_CODES.INVITE_CODE_REQUIRED,
    })
  }

  if (!inviteCode) return

  const record = await db.inviteCode.findUnique({
    where: { code: inviteCode },
  })

  if (!record) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.INVITE_CODE_INVALID,
      code: ERROR_CODES.INVITE_CODE_INVALID,
    })
  }

  if (record.expiresAt && record.expiresAt < new Date()) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.INVITE_CODE_EXPIRED,
      code: ERROR_CODES.INVITE_CODE_EXPIRED,
    })
  }

  if (record.maxUses !== null && record.usedCount >= record.maxUses) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.INVITE_CODE_USAGE_EXCEEDED,
      code: ERROR_CODES.INVITE_CODE_USAGE_EXCEEDED,
    })
  }
}

/**
 * Record invite code usage after successful registration
 */
export async function recordInviteCodeUsage (
  inviteCode: string,
  userId: string,
  tx?: Pick<typeof db, 'inviteRecord' | 'inviteCode'>,
): Promise<void> {
  const client = tx || db

  await client.inviteRecord.create({
    data: { inviteCode, userId },
  })

  await client.inviteCode.update({
    where: { code: inviteCode },
    data: { usedCount: { increment: 1 }},
  })
}

// ============================================================================
// Better Auth Configuration
// ============================================================================

/**
 * Additional data passed through OAuth flow
 */
interface OAuthAdditionalData {
  inviteCode?: string
  marketingEmails?: boolean
}

export const auth = betterAuth({
  appName: process.env.APP_NAME,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),

  // Session configuration for sliding expiration
  session: {
    expiresIn: 60 * 60 * 24 * 365, // 1 year (effectively no max limit)
    updateAge: 60 * 60 * 24, // 24 hours idle timeout
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache to reduce DB queries
    },
  },

  // Account linking: auto-link OAuth accounts with same verified email
  account: {
    accountLinking: {
      enabled: true,
    },
  },

  // Custom cookie names using underscore prefix instead of dots
  // Dots in cookie names can cause parsing issues in some environments
  advanced: {
    cookiePrefix: 'polymarbot',
    database: {
      // Use cuid for all models to match our VarChar(25) schema
      generateId: () => createId(),
    },
  },

  // OAuth providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Require explicit requestSignUp: true for new users
      disableImplicitSignUp: true,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      disableImplicitSignUp: true,
    },
  },

  // Plugins
  plugins: [
    // Custom plugin for sign-in with Turnstile + rate limiting
    emailOtpSignin({
      ...OTP_CONFIG,
      async sendVerificationOTP ({ email, otp }) {
        await sendVerificationEmail(email, otp)
      },
    }),
    // Custom plugin for sign-up with invite code validation
    emailOtpSignup({
      ...OTP_CONFIG,
      async sendVerificationOTP ({ email, otp }) {
        await sendVerificationEmail(email, otp)
      },
    }),
  ],

  // Database hooks for OAuth sign-up with invite code
  databaseHooks: {
    user: {
      create: {
        before: async (_user, ctx) => {
          // Only validate invite code for OAuth sign-up (callback path)
          if (!ctx?.path?.startsWith('/callback/')) {
            return
          }

          const additionalData = (await getOAuthState()) as OAuthAdditionalData | undefined
          await validateInviteCode(additionalData?.inviteCode)
        },

        after: async user => {
          const additionalData = (await getOAuthState()) as OAuthAdditionalData | undefined
          const inviteCode = additionalData?.inviteCode
          const marketingEmails = additionalData?.marketingEmails ?? false

          // Create or update UserSettings
          await db.userSettings.upsert({
            where: { userId: user.id },
            create: { userId: user.id, marketingEmails },
            update: { marketingEmails },
          })

          // Record invite code usage
          if (inviteCode) {
            await recordInviteCodeUsage(inviteCode, user.id)
          }
        },
      },
    },
  },
})

// Better-auth inferred types (renamed to avoid conflict with Prisma types)
export type AuthSession = typeof auth.$Infer.Session
export type AuthUser = typeof auth.$Infer.Session.user
