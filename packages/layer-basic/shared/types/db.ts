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
  Bot,
  BotOperationHistory,
  InviteCode,
  InviteRecord,
  Prisma,
  Session,
  Strategy,
  SubscriptionPayment,
  User,
  UserSettings,
  UserSubscription,
  Verification,
  Wallet,
} from '@root/prisma/app/generated/client'

export {
  BillingCycle,
  BotOperationType,
  PaymentStatus,
  SubscriptionPlan,
  WalletStatus,
} from '@root/prisma/app/generated/enums'

export type {
  BillingCycle as BillingCycleType,
  BotOperationType as BotOperationTypeValue,
  PaymentStatus as PaymentStatusType,
  SubscriptionPlan as SubscriptionPlanType,
  WalletStatus as WalletStatusType,
} from '@root/prisma/app/generated/enums'

// =============================================================================
// Bot Database Types (MySQL, read-only)
// =============================================================================

export type {
  MarketStrategy,
  MarketStrategyProfit,
  WalletTransaction,
} from '@root/prisma/bot/generated/client'

export {
  WalletTransactionAction,
} from '@root/prisma/bot/generated/enums'

export type {
  WalletTransactionAction as WalletTransactionActionType,
} from '@root/prisma/bot/generated/enums'

/**
 * Bot operation reason codes (not database enum for easier extension)
 */
export const BotOperationReason = {
  USER_ACTION: 'USER_ACTION',
  WALLET_INSUFFICIENT_BALANCE: 'WALLET_INSUFFICIENT_BALANCE',
  WALLET_TRANSACTION_ERROR: 'WALLET_TRANSACTION_ERROR',
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
} as const

export type BotOperationReasonType = (typeof BotOperationReason)[keyof typeof BotOperationReason]
