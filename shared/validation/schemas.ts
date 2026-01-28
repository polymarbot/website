/**
 * Unified API validation schemas
 *
 * This module provides Zod schemas for API parameter validation,
 * shared between server-side API handlers and client-side form validation.
 *
 * Validation error messages are encoded as i18n keys using encodeI18nKey().
 * Consumers should use translateI18nKey() to translate them at display time.
 */

import { z } from 'zod'
import { BillingCycle, WalletStatus } from '../types/db'
import { MarketInterval, MarketSymbol } from '../types/market'
import { encodeI18nKey } from '../utils/i18n-key'
import { StatsDatePreset } from '../utils/statsAccess'
import { PAID_PLANS } from '../utils/subscription'

/** HTTP methods for API validation */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** Schema key format: "METHOD /endpoint" */
export type SchemaKey = `${ApiMethod} ${string}`

// ============================================================================
// Schema Fragments
// ============================================================================

/** Validation namespace for i18n keys */
const namespace = 'shared.validation'

/**
 * Reusable schema fragments with i18n keys
 * Error messages are encoded as i18n keys for later translation
 */
const schemaFragments = {
  /** Email address */
  email: z.email({ error: issue => issue.input === undefined ? encodeI18nKey(`${namespace}.email.required`) : encodeI18nKey(`${namespace}.email.invalid`) }),

  /** Ethereum private key format: 0x + 64 hex characters */
  privateKey: z
    .string({ error: issue => issue.input === undefined ? encodeI18nKey(`${namespace}.privateKey.required`) : encodeI18nKey(`${namespace}.privateKey.invalid`) })
    .regex(/^0x[a-fA-F0-9]{64}$/, { error: encodeI18nKey(`${namespace}.privateKey.invalid`) }),

  /** Wallet address format: 0x + 40 hex characters */
  walletAddress: z
    .string({ error: issue => issue.input === undefined ? encodeI18nKey(`${namespace}.walletAddress.required`) : encodeI18nKey(`${namespace}.walletAddress.invalid`) })
    .regex(/^0x[a-fA-F0-9]{40}$/, { error: encodeI18nKey(`${namespace}.walletAddress.invalid`) }),

  /** Wallet name: 1-100 characters */
  walletName: z
    .string({ error: encodeI18nKey(`${namespace}.walletName.required`) })
    .nonempty({ error: encodeI18nKey(`${namespace}.walletName.required`) })
    .max(100, { error: encodeI18nKey(`${namespace}.walletName.tooLong`, { maximum: 100 }) }),

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

  /** RSA public key: Base64 encoded SPKI format (2048-bit RSA key is ~392 chars) */
  rsaPublicKey: z
    .string({ error: issue => issue.input === undefined ? encodeI18nKey(`${namespace}.publicKey.required`) : encodeI18nKey(`${namespace}.publicKey.invalid`) })
    .regex(/^[A-Za-z0-9+/]+=*$/, { error: encodeI18nKey(`${namespace}.publicKey.invalid`) })
    .min(300, { error: encodeI18nKey(`${namespace}.publicKey.invalid`) })
    .max(500, { error: encodeI18nKey(`${namespace}.publicKey.invalid`) }),

  /** Strategy name: 1-100 characters */
  strategyName: z
    .string({ error: encodeI18nKey(`${namespace}.strategyName.required`) })
    .nonempty({ error: encodeI18nKey(`${namespace}.strategyName.required`) })
    .max(100, { error: encodeI18nKey(`${namespace}.strategyName.tooLong`, { maximum: 100 }) }),

  /** Strategy JSON: only validates non-empty */
  strategyJson: z
    .string({ error: encodeI18nKey(`${namespace}.strategyJson.required`) })
    .nonempty({ error: encodeI18nKey(`${namespace}.strategyJson.required`) }),

  /** Strategy ID reference */
  strategyId: z
    .string({ error: encodeI18nKey(`${namespace}.strategyId.required`) })
    .nonempty({ error: encodeI18nKey(`${namespace}.strategyId.required`) }),

  /** Market interval: time interval for strategy/bot */
  marketInterval: z.enum(MarketInterval, { error: encodeI18nKey(`${namespace}.marketInterval.invalid`) }),

  /** Market symbol: trading pair symbol */
  marketSymbol: z.enum(MarketSymbol, { error: encodeI18nKey(`${namespace}.marketSymbol.invalid`) }),
}

// ============================================================================
// Schema Definitions
// ============================================================================

/** Schema definition map indexed by "METHOD /endpoint" */
type SchemaDefinitions = Record<SchemaKey, () => z.ZodType>

const schemaDefinitions = {
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
  // Wallet endpoints
  // --------------------------------------------------------------------------

  'GET /api/wallets': () => {
    return z.object({
      'offset': z.coerce.number().int().min(0).default(0),
      'limit': z.coerce.number().int().min(1).max(100).default(10),
      'keyword': z.string().optional(),
      'status': z.enum(WalletStatus).optional(),
      // Bot filters - filter wallets by bot associations
      'botFilters.symbol': z.string().optional(), // Comma-separated symbols
      'botFilters.interval': z.string().optional(), // Comma-separated intervals
      'botFilters.exclude': z.coerce.boolean().default(false), // Reverse filter
      // Wallet filters - filter by funder addresses
      'walletFilters.funders': z.string().optional(), // Comma-separated funder addresses
      'walletFilters.exclude': z.coerce.boolean().default(false), // Reverse filter
    })
  },

  'POST /api/wallets': () => {
    return z.object({
      name: schemaFragments.walletName,
    })
  },

  'POST /api/wallets/import': () => {
    return z.object({
      name: schemaFragments.walletName,
      privateKey: schemaFragments.privateKey,
    })
  },

  'PATCH /api/wallets/[funder]': () => {
    return z.object({
      name: schemaFragments.walletName,
    })
  },

  'GET /api/wallets/[funder]/export': () => {
    return z.object({
      publicKey: schemaFragments.rsaPublicKey,
    })
  },

  'POST /api/wallets/[funder]/withdraw': () => {
    return z.object({
      toAddress: schemaFragments.walletAddress,
      // Use coerce.string() to handle both string and number inputs from forms
      amount: z
        .coerce
        .string({ error: encodeI18nKey(`${namespace}.withdrawAmount.required`) })
        .nonempty({ error: encodeI18nKey(`${namespace}.withdrawAmount.required`) })
        .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
          message: encodeI18nKey(`${namespace}.withdrawAmount.min`),
        }),
    })
  },

  'GET /api/wallets/[funder]/transactions': () => {
    return z.object({
      offset: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    })
  },

  'GET /api/wallets/[funder]/profit-history': () => {
    return z.object({
      days: z.coerce.number().int().min(1).max(365).default(30),
    })
  },

  // --------------------------------------------------------------------------
  // Strategy endpoints
  // --------------------------------------------------------------------------

  'GET /api/strategies': () => {
    return z.object({
      offset: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      keyword: z.string().optional(),
      interval: z.enum(MarketInterval).optional(),
    })
  },

  'POST /api/strategies/check': () => {
    return z.object({
      strategyJson: schemaFragments.strategyJson,
      interval: schemaFragments.marketInterval,
    })
  },

  'POST /api/strategies': () => {
    return z.object({
      name: schemaFragments.strategyName,
      interval: schemaFragments.marketInterval,
      strategyJson: schemaFragments.strategyJson,
    })
  },

  'PATCH /api/strategies/[id]': () => {
    return z.object({
      name: schemaFragments.strategyName.optional(),
      interval: schemaFragments.marketInterval.optional(),
      strategyJson: schemaFragments.strategyJson.optional(),
    })
  },

  // --------------------------------------------------------------------------
  // Bot endpoints
  // --------------------------------------------------------------------------

  'GET /api/bots': () => {
    return z.object({
      offset: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      keyword: z.string().optional(),
      symbols: z.string().optional(), // Comma-separated symbols (e.g., "btc,eth")
      intervals: z.string().optional(), // Comma-separated intervals (e.g., "15m,1h")
      funder: z.string().optional(), // Filter by wallet funder address
      strategyId: z.string().optional(), // Filter by strategy ID
    })
  },

  'POST /api/bots': () => {
    return z.object({
      symbol: schemaFragments.marketSymbol,
      interval: schemaFragments.marketInterval,
      funder: schemaFragments.walletAddress,
      strategyId: schemaFragments.strategyId,
    })
  },

  'GET /api/bots/[id]/operation-history': () => {
    return z.object({
      offset: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      startTime: z.coerce.number().int().min(0).optional(),
      endTime: z.coerce.number().int().min(0).optional(),
    })
  },

  'GET /api/bots/[id]/run-logs': () => {
    return z.object({
      cursor: z.coerce.number().int().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(100),
      startTime: z.coerce.number().int().min(0).optional(),
      endTime: z.coerce.number().int().min(0).optional(),
    })
  },

  'POST /api/bots/batch-enable': () => {
    return z.object({
      symbols: z.array(schemaFragments.marketSymbol).optional(),
      intervals: z.array(schemaFragments.marketInterval).optional(),
      funder: schemaFragments.walletAddress.optional(),
      strategyId: schemaFragments.strategyId.optional(),
      ids: z.array(z.string()).optional(),
    })
  },

  'POST /api/bots/batch-disable': () => {
    return z.object({
      symbols: z.array(schemaFragments.marketSymbol).optional(),
      intervals: z.array(schemaFragments.marketInterval).optional(),
      funder: schemaFragments.walletAddress.optional(),
      strategyId: schemaFragments.strategyId.optional(),
      ids: z.array(z.string()).optional(),
    })
  },

  'POST /api/bots/batch-delete': () => {
    return z.object({
      symbols: z.array(schemaFragments.marketSymbol).optional(),
      intervals: z.array(schemaFragments.marketInterval).optional(),
      funder: schemaFragments.walletAddress.optional(),
      strategyId: schemaFragments.strategyId.optional(),
      ids: z.array(z.string()).optional(),
    })
  },

  'POST /api/bots/batch-create': () => {
    return z.object({
      interval: schemaFragments.marketInterval,
      funder: schemaFragments.walletAddress,
      strategyId: schemaFragments.strategyId,
      symbols: z.array(schemaFragments.marketSymbol).optional(),
    })
  },

  // --------------------------------------------------------------------------
  // Internal API endpoints (for private scripts)
  // --------------------------------------------------------------------------

  'GET /api/internal/bots': () => {
    return z.object({
      offset: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(1000).default(10),
    })
  },

  'GET /api/internal/wallets': () => {
    return z.object({
      offset: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(1000).default(10),
    })
  },

  'POST /api/internal/bots/[id]/disable': () => {
    return z.object({
      reason: z
        .string({ error: encodeI18nKey(`${namespace}.botDisableReason.required`) })
        .nonempty({ error: encodeI18nKey(`${namespace}.botDisableReason.required`) }),
    })
  },

  // --------------------------------------------------------------------------
  // Dashboard endpoints
  // --------------------------------------------------------------------------

  'GET /api/dashboard/profit-history': () => {
    return z.object({
      days: z.coerce.number().int().min(1).max(365).default(30),
    })
  },

  // --------------------------------------------------------------------------
  // Market Strategy endpoints
  // --------------------------------------------------------------------------

  'POST /api/market-strategies/stats': () => {
    return z.object({
      strategyJson: schemaFragments.strategyJson,
      interval: schemaFragments.marketInterval,
      symbols: z.string().optional(), // Comma-separated symbols (e.g., "btc,eth")
      datePreset: z.enum(StatsDatePreset, { error: encodeI18nKey(`${namespace}.datePreset.invalid`) }).default(StatsDatePreset.MONTH),
      customStart: z.coerce.number().int().min(0).optional(),
      customEnd: z.coerce.number().int().min(0).optional(),
    })
      .refine(
        data => !data.customStart || !data.customEnd || data.customStart <= data.customEnd,
        { message: encodeI18nKey(`${namespace}.timeRange.startAfterEnd`) },
      )
  },

  'GET /api/market-strategies/rankings': () => {
    return z.object({
      datePreset: z.enum(StatsDatePreset, { error: encodeI18nKey(`${namespace}.datePreset.invalid`) }).default(StatsDatePreset.MONTH),
      customStart: z.coerce.number().int().min(0).optional(),
      customEnd: z.coerce.number().int().min(0).optional(),
      symbol: z.string().optional(),
      interval: z.string().optional(),
      minAmount: z.coerce.number().min(0).optional(),
      maxAmount: z.coerce.number().min(0).optional(),
      minBaseCount: z.coerce.number().int().min(1).default(10),
    })
      .refine(
        data => !data.customStart || !data.customEnd || data.customStart <= data.customEnd,
        { message: encodeI18nKey(`${namespace}.timeRange.startAfterEnd`) },
      )
      .refine(
        data => !data.minAmount || !data.maxAmount || data.minAmount <= data.maxAmount,
        { message: encodeI18nKey(`${namespace}.amountRange.minGreaterThanMax`) },
      )
  },

  // --------------------------------------------------------------------------
  // Subscription Payment endpoints
  // --------------------------------------------------------------------------

  'POST /api/subscription/create-charge': () => {
    return z.object({
      plan: z.enum(PAID_PLANS, { error: encodeI18nKey(`${namespace}.subscriptionPlan.invalid`) }),
      billingCycle: z.enum(BillingCycle, { error: encodeI18nKey(`${namespace}.billingCycle.invalid`) }),
    })
  },

  'GET /api/subscription/payments': () => {
    return z.object({
      offset: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    })
  },
} satisfies SchemaDefinitions

// ============================================================================
// Type Exports
// ============================================================================

/** Available API validation schema keys */
export type ApiValidationSchemaKey = keyof typeof schemaDefinitions

/** Get schema return type for a given key */
export type ApiValidationSchemaReturnType<K extends ApiValidationSchemaKey> = ReturnType<(typeof schemaDefinitions)[K]>

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a validation schema for a specific API endpoint
 *
 * Error messages in the returned schema are encoded as i18n keys.
 * Use translateI18nKey() to translate them at display time.
 *
 * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param endpoint - API endpoint path
 * @returns Zod schema for the endpoint
 *
 * @example
 * ```ts
 * const schema = createApiValidationSchema('POST', '/api/wallets/import')
 * const result = schema.safeParse(body)
 * if (!result.success) {
 *   const message = translateI18nKey(result.error.issues[0].message, t)
 * }
 * ```
 */
export function createApiValidationSchema<
  M extends ApiMethod,
  E extends string,
  K extends `${M} ${E}` & ApiValidationSchemaKey = `${M} ${E}` & ApiValidationSchemaKey,
> (
  method: M,
  endpoint: E,
): ApiValidationSchemaReturnType<K> {
  const key = `${method} ${endpoint}` as K
  const factory = schemaDefinitions[key]

  if (!factory) {
    throw new Error(`No schema defined for ${key}`)
  }

  return factory() as ApiValidationSchemaReturnType<K>
}
