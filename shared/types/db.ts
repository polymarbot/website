/**
 * Centralized database type definitions
 *
 * Re-exports Prisma types and enums for centralized type management.
 * Import enums as values (not types) to use them at runtime.
 */

// =============================================================================
// Prisma Runtime Types
// =============================================================================

export type { Decimal } from '@prisma/client-runtime-utils'

// =============================================================================
// App Database Types (PostgreSQL)
// =============================================================================

export type {
  Account,
  BillingCycle as BillingCycleType,
  Bot,
  BotOperationHistory,
  BotOperationType as BotOperationTypeValue,
  InviteCode,
  InviteRecord,
  PaymentStatus as PaymentStatusType,
  Prisma,
  Session,
  Strategy,
  SubscriptionPayment,
  SubscriptionPlan as SubscriptionPlanType,
  User,
  UserSettings,
  UserSubscription,
  Verification,
  Wallet,
  WalletStatus as WalletStatusType,
} from '~~/prisma/app/generated/client'

export {
  BillingCycle,
  BotOperationType,
  PaymentStatus,
  SubscriptionPlan,
  WalletStatus,
} from '~~/prisma/app/generated/enums'

// =============================================================================
// Bot Database Types (MySQL, read-only)
// =============================================================================

export type {
  MarketStrategy,
  MarketStrategyProfit,
  WalletTransaction,
  WalletTransactionAction as WalletTransactionActionType,
} from '~~/prisma/bot/generated/client'

export {
  WalletTransactionAction,
} from '~~/prisma/bot/generated/enums'

/**
 * Bot operation reason codes (not database enum for easier extension)
 */
export const BotOperationReason = {
  USER_ACTION: 'USER_ACTION',
  WALLET_INSUFFICIENT_BALANCE: 'WALLET_INSUFFICIENT_BALANCE',
  WALLET_TRANSACTION_ERROR: 'WALLET_TRANSACTION_ERROR',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
} as const

export type BotOperationReasonType = (typeof BotOperationReason)[keyof typeof BotOperationReason]
