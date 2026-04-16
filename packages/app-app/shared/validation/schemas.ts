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
import { MarketInterval, MarketSymbol } from '../types/market'
import { schemaDefinitions as authSchemaDefinitions } from '@packages/layer-auth/shared/validation/schemas'

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

  /** Positive numeric amount (accepts string/number input from forms) */
  amount: z.coerce
    .string({ error: encodeI18nKey(`${namespace}.amount.required`) })
    .nonempty({ error: encodeI18nKey(`${namespace}.amount.required`) })
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: encodeI18nKey(`${namespace}.amount.min`),
    }),

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
// Schema Helpers
// ============================================================================

/** Reusable pagination fields (offset + limit) */
function paginationFields (maxLimit = 100, defaultLimit = 10) {
  return {
    offset: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
  }
}

/** Shared bot batch filter schema (used by batch-enable, batch-disable, batch-delete) */
function createBotBatchSchema () {
  return z.object({
    symbols: z.array(schemaFragments.marketSymbol).optional(),
    intervals: z.array(schemaFragments.marketInterval).optional(),
    funder: schemaFragments.walletAddress.optional(),
    strategyId: schemaFragments.strategyId.optional(),
    ids: z.array(z.string()).optional(),
  })
}

/** Shared bridge transaction schema (used by both quote and withdraw endpoints) */
function createBridgeTransactionSchema () {
  return z.object({
    toChainId: z.coerce
      .number({ error: encodeI18nKey(`${namespace}.bridgeChainId.required`) })
      .int({ error: encodeI18nKey(`${namespace}.bridgeChainId.invalid`) }),
    toTokenAddress: z
      .string({ error: encodeI18nKey(`${namespace}.bridgeTokenAddress.required`) })
      .nonempty({ error: encodeI18nKey(`${namespace}.bridgeTokenAddress.required`) }),
    recipientAddr: z
      .string({ error: encodeI18nKey(`${namespace}.bridgeRecipientAddr.required`) })
      .nonempty({ error: encodeI18nKey(`${namespace}.bridgeRecipientAddr.required`) })
      .min(10, { error: encodeI18nKey(`${namespace}.bridgeRecipientAddr.invalid`) }),
    amount: schemaFragments.amount,
  }).superRefine((data, ctx) => {
    const error = validateRecipientAddress(data.recipientAddr, data.toChainId)
    if (error) {
      ctx.addIssue({
        code: 'custom',
        message: encodeI18nKey(error),
        path: [ 'recipientAddr' ],
      })
    }
  })
}

// ============================================================================
// Schema Definitions
// ============================================================================

const schemaDefinitions = {
  ...authSchemaDefinitions,

  // --------------------------------------------------------------------------
  // Wallet endpoints
  // --------------------------------------------------------------------------

  'GET /api/wallets': () => {
    return z.object({
      ...paginationFields(),
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

  'POST /api/wallets/bridge-quote': () => createBridgeTransactionSchema(),

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

  'POST /api/wallets/[funder]/transfer': () => {
    return z.object({
      toAddress: schemaFragments.walletAddress,
      amount: schemaFragments.amount,
    })
  },

  'POST /api/wallets/[funder]/withdraw': () => createBridgeTransactionSchema(),

  'GET /api/wallets/[funder]/transactions': () => {
    return z.object({
      ...paginationFields(),
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
      ...paginationFields(),
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
      ...paginationFields(),
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

  'GET /api/bots/[id]/transactions': () => {
    return z.object({
      ...paginationFields(),
    })
  },

  'GET /api/bots/[id]/profit-history': () => {
    return z.object({
      days: z.coerce.number().int().min(1).max(365).default(30),
    })
  },

  'GET /api/bots/[id]/operation-history': () => {
    return z.object({
      ...paginationFields(),
      startTime: z.coerce.number().int().min(0).optional(),
      endTime: z.coerce.number().int().min(0).optional(),
    })
  },

  'GET /api/bots/[id]/run-logs': () => {
    return z.object({
      cursor: z.string().optional(), // Compound cursor: "id,timestamp"
      limit: z.coerce.number().int().min(1).max(100).default(100),
      direction: z.enum([ 'backward', 'forward' ]).default('backward'),
      startTime: z.coerce.number().int().min(0).optional(),
      endTime: z.coerce.number().int().min(0).optional(),
    })
  },

  'POST /api/bots/batch-enable': () => createBotBatchSchema(),
  'POST /api/bots/batch-disable': () => createBotBatchSchema(),
  'POST /api/bots/batch-delete': () => createBotBatchSchema(),

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
      ...paginationFields(1000),
      interval: z.string().optional(), // Filter by time interval (e.g., "5m", "1h")
    })
  },

  'GET /api/internal/wallets': () => {
    return z.object({
      ...paginationFields(1000),
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
      botId: z.string().optional(), // Filter by bot ID
      datePreset: z.enum(StatsDatePreset, { error: encodeI18nKey(`${namespace}.datePreset.invalid`) }).default(StatsDatePreset.MONTH),
      customStart: z.coerce.number().int().min(0).optional(),
      customEnd: z.coerce.number().int().min(0).optional(),
    })
      .refine(
        data => data.datePreset !== StatsDatePreset.CUSTOM || (data.customStart != null && data.customStart > 0),
        { message: encodeI18nKey(`${namespace}.timeRange.customStartRequired`) },
      )
      .refine(
        data => data.datePreset !== StatsDatePreset.CUSTOM || (data.customEnd != null && data.customEnd > 0),
        { message: encodeI18nKey(`${namespace}.timeRange.customEndRequired`) },
      )
      .refine(
        data => data.datePreset !== StatsDatePreset.CUSTOM || !data.customStart || !data.customEnd || data.customStart <= data.customEnd,
        { message: encodeI18nKey(`${namespace}.timeRange.startAfterEnd`) },
      )
      .refine(
        data => data.datePreset !== StatsDatePreset.CUSTOM || !data.customStart || !data.customEnd || (data.customEnd - data.customStart) <= MAX_DATE_RANGE_DAYS * 86400,
        { message: encodeI18nKey(`${namespace}.timeRange.exceedsMaxSpan`, { days: MAX_DATE_RANGE_DAYS }) },
      )
  },

  'POST /api/market-strategies/stats-symbol-counts': () => {
    return z.object({
      strategyJson: schemaFragments.strategyJson,
      interval: schemaFragments.marketInterval,
      botId: z.string().optional(),
      datePreset: z.enum(StatsDatePreset, { error: encodeI18nKey(`${namespace}.datePreset.invalid`) }).default(StatsDatePreset.MONTH),
      customStart: z.coerce.number().int().min(0).optional(),
      customEnd: z.coerce.number().int().min(0).optional(),
    })
      .refine(
        data => data.datePreset !== StatsDatePreset.CUSTOM || (data.customStart != null && data.customStart > 0),
        { message: encodeI18nKey(`${namespace}.timeRange.customStartRequired`) },
      )
      .refine(
        data => data.datePreset !== StatsDatePreset.CUSTOM || (data.customEnd != null && data.customEnd > 0),
        { message: encodeI18nKey(`${namespace}.timeRange.customEndRequired`) },
      )
      .refine(
        data => data.datePreset !== StatsDatePreset.CUSTOM || !data.customStart || !data.customEnd || data.customStart <= data.customEnd,
        { message: encodeI18nKey(`${namespace}.timeRange.startAfterEnd`) },
      )
      .refine(
        data => data.datePreset !== StatsDatePreset.CUSTOM || !data.customStart || !data.customEnd || (data.customEnd - data.customStart) <= MAX_DATE_RANGE_DAYS * 86400,
        { message: encodeI18nKey(`${namespace}.timeRange.exceedsMaxSpan`, { days: MAX_DATE_RANGE_DAYS }) },
      )
  },

  'GET /api/market-strategies/rankings': () => {
    return z.object({
      datePreset: z.enum(StatsDatePreset, { error: encodeI18nKey(`${namespace}.datePreset.invalid`) }).default(StatsDatePreset.MONTH),
      customStart: z.coerce.number().int().min(0).optional(),
      customEnd: z.coerce.number().int().min(0).optional(),
      symbols: z.string().optional(),
      intervals: z.string().optional(),
      minBuySize: z.coerce.number().int().min(0).optional(),
      maxBuySize: z.coerce.number().int().min(0).optional(),
      minRecordCount: z.coerce.number().int().min(0).max(10000).default(0),
      minParticipatedCount: z.coerce.number().int().min(0).max(10000).default(0),
    })
      .refine(
        data => data.datePreset !== StatsDatePreset.CUSTOM || (data.customStart != null && data.customStart > 0),
        { message: encodeI18nKey(`${namespace}.timeRange.customStartRequired`) },
      )
      .refine(
        data => data.datePreset !== StatsDatePreset.CUSTOM || (data.customEnd != null && data.customEnd > 0),
        { message: encodeI18nKey(`${namespace}.timeRange.customEndRequired`) },
      )
      .refine(
        data => data.datePreset !== StatsDatePreset.CUSTOM || !data.customStart || !data.customEnd || data.customStart <= data.customEnd,
        { message: encodeI18nKey(`${namespace}.timeRange.startAfterEnd`) },
      )
      .refine(
        data => data.datePreset !== StatsDatePreset.CUSTOM || !data.customStart || !data.customEnd || (data.customEnd - data.customStart) <= MAX_DATE_RANGE_DAYS * 86400,
        { message: encodeI18nKey(`${namespace}.timeRange.exceedsMaxSpan`, { days: MAX_DATE_RANGE_DAYS }) },
      )
      .refine(
        data => !data.minBuySize || !data.maxBuySize || data.minBuySize <= data.maxBuySize,
        { message: encodeI18nKey(`${namespace}.buySizeRange.minGreaterThanMax`) },
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
      ...paginationFields(),
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
