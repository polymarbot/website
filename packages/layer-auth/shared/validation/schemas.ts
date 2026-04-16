import { z } from 'zod'

// ============================================================================
// Schema Fragments
// ============================================================================

/** Validation namespace for i18n keys */
const namespace = 'shared.validation'

/**
 * Reusable schema fragments with i18n keys
 * Error messages are encoded as i18n keys for later translation
 *
 * Exported for use in sub-packages that extend validation schemas.
 */
export const schemaFragments = {
  /** Email address */
  email: z.email({ error: issue => issue.input === undefined ? encodeI18nKey(`${namespace}.email.required`) : encodeI18nKey(`${namespace}.email.invalid`) }),

  /** Numeric verification code (length validated at runtime) */
  verificationCode: z
    .string({ error: issue => issue.input === undefined ? encodeI18nKey(`${namespace}.verificationCode.required`) : encodeI18nKey(`${namespace}.verificationCode.invalid`) })
    .regex(/^\d+$/, { error: encodeI18nKey(`${namespace}.verificationCode.invalid`) }),

  /** Invite code: 1-32 alphanumeric characters with hyphens */
  inviteCode: z
    .string({ error: issue => issue.input === undefined ? encodeI18nKey(`${namespace}.inviteCode.required`) : encodeI18nKey(`${namespace}.inviteCode.invalid`) })
    .nonempty({ error: encodeI18nKey(`${namespace}.inviteCode.required`) })
    .max(32, { error: encodeI18nKey(`${namespace}.inviteCode.invalid`) })
    .regex(/^[a-zA-Z0-9-]+$/, { error: encodeI18nKey(`${namespace}.inviteCode.invalid`) }),

  /** Turnstile verification token */
  turnstileToken: z
    .string({ error: issue => issue.input === undefined ? encodeI18nKey(`${namespace}.turnstileToken.required`) : encodeI18nKey(`${namespace}.turnstileToken.invalid`) })
    .nonempty({ error: encodeI18nKey(`${namespace}.turnstileToken.required`) }),
}

// ============================================================================
// Schema Definitions
// ============================================================================

export const schemaDefinitions = {
  // --------------------------------------------------------------------------
  // Auth - Sign-up endpoints (better-auth plugin)
  // --------------------------------------------------------------------------

  'POST /api/auth/email-otp-signup/send-otp': () => {
    return z.object({
      email: schemaFragments.email,
      inviteCode: schemaFragments.inviteCode.optional(),
      turnstileToken: schemaFragments.turnstileToken,
    })
  },

  'POST /api/auth/email-otp-signup/verify-otp': () => {
    return z.object({
      email: schemaFragments.email,
      otp: schemaFragments.verificationCode,
      inviteCode: schemaFragments.inviteCode.optional(),
      marketingEmails: z.boolean().default(false),
    })
  },

  // --------------------------------------------------------------------------
  // Auth - Sign-in endpoints (better-auth plugin)
  // --------------------------------------------------------------------------

  'POST /api/auth/email-otp-signin/send-otp': () => {
    return z.object({
      email: schemaFragments.email,
      turnstileToken: schemaFragments.turnstileToken,
    })
  },

  'POST /api/auth/email-otp-signin/verify-otp': () => {
    return z.object({
      email: schemaFragments.email,
      otp: schemaFragments.verificationCode,
    })
  },

  // --------------------------------------------------------------------------
  // Auth - Impersonation endpoints (better-auth plugin)
  // --------------------------------------------------------------------------

  'GET /api/auth/impersonate': () => {
    return z.object({
      ticket: z
        .string({ error: encodeI18nKey(`${namespace}.impersonationTicket.required`) })
        .nonempty({ error: encodeI18nKey(`${namespace}.impersonationTicket.required`) }),
    })
  },
} satisfies SchemaDefinitions
