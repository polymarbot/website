import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { getOAuthState } from 'better-auth/api'
import { createId } from '@paralleldrive/cuid2'
import { emailOtpSignup } from './plugins/emailOtpSignup'
import { emailOtpSignin } from './plugins/emailOtpSignin'
import { impersonation } from './plugins/impersonation'
import { validateInviteCode, recordInviteCodeUsage } from './utils'

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
  baseURL: process.env.APP_ORIGIN,
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),

  // Session configuration for sliding expiration
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Refresh session expiration every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache to reduce DB queries
    },
    additionalFields: {
      impersonatedBy: {
        type: 'string',
        required: false,
      },
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
    cookiePrefix: process.env.APP_NAME,
    database: {
      // Use cuid for all models to match our VarChar(25) schema
      generateId: () => createId(),
    },
  },

  // OAuth providers (only enabled when credentials are configured)
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        disableImplicitSignUp: true,
      },
    }),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        disableImplicitSignUp: true,
      },
    }),
  },

  // Plugins
  plugins: [
    // Custom plugin for sign-in with Turnstile + rate limiting
    emailOtpSignin({
      ...OTP_CONFIG,
      async sendVerificationOTP ({ email, otp }) {
        await sendVerificationEmail(email, otp, OTP_CONFIG.expiresIn)
      },
    }),
    // Custom plugin for sign-up with invite code validation
    emailOtpSignup({
      db,
      ...OTP_CONFIG,
      async sendVerificationOTP ({ email, otp }) {
        await sendVerificationEmail(email, otp, OTP_CONFIG.expiresIn)
      },
    }),
    // Support login (impersonation) plugin
    impersonation(),
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
          await validateInviteCode(db, additionalData?.inviteCode)
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
            await recordInviteCodeUsage(db, inviteCode, user.id)
          }
        },
      },
    },
  },
})

// Better-auth inferred types (renamed to avoid conflict with Prisma types)
export type AuthSession = typeof auth.$Infer.Session
export type AuthUser = typeof auth.$Infer.Session.user
