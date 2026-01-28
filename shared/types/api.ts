/**
 * API Response Types
 *
 * Centralized type definitions for all API responses.
 * These types are shared between server and client code.
 */

import type { MarketIntervalType, MarketSymbolType } from './market'
import type {
  BillingCycleType,
  PaymentStatusType,
  SubscriptionPlanType,
  WalletStatusType,
} from './db'

// ============================================================================
// Wallet Types
// ============================================================================

export interface WalletItem {
  funder: string
  name: string
  status: WalletStatusType
  balance: string
  createdAt: string
  updatedAt: string
}

export interface WalletTransactionItem {
  id: string
  action: string
  amount: string
  timestamp: string
  transactionHash: string | null
  slug: string | null
}

// ============================================================================
// Bot Types
// ============================================================================

export interface BotItem {
  id: string
  symbol: MarketSymbolType
  interval: MarketIntervalType
  funder: string
  strategyId: string
  enabled: boolean
  enabledAt: string | null
  totalRuntimeSeconds: number
  createdAt: string
  updatedAt: string
  wallet: {
    name: string
    status: WalletStatusType
    balance: string
  }
  strategy: {
    name: string
    amount: string
    strategyJson: string
  }
}

export interface BotCountItem {
  enabled: number
  total: number
}

export interface BotOperationHistoryItem {
  id: string
  action: string
  reason: string | null
  createdAt: string
}

// ============================================================================
// Strategy Types
// ============================================================================

export interface StrategyItem {
  id: string
  name: string
  interval: MarketIntervalType
  amount: string
  botCount: number
  createdAt: string
  updatedAt: string
}

export interface StrategyDetail {
  id: string
  name: string
  interval: MarketIntervalType
  strategyJson: string
  amount: string
  createdAt: string
  updatedAt: string
}

export interface StrategyStats {
  total: number
  participated: number
  profitable: number
  totalCost: string
  totalProfit: string
  apr: number
  profitRate: number
  winRate: number
  hitRate: number
}

export interface StrategyRanking extends StrategyStats {
  strategyId: number
  strategyJson: string
  interval: string
}

export interface RankingsResponse {
  aprRankings: StrategyRanking[]
  profitRateRankings: StrategyRanking[]
  winRateRankings: StrategyRanking[]
  hitRateRankings: StrategyRanking[]
}

export interface MarketStrategyDetail {
  id: number
  strategyJson: string
  amount: string
  interval: string
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardStats {
  walletCount: number
  strategyCount: number
  botCount: number
  runningBotCount: number
}

export interface DailyProfit {
  date: string
  netProfit: string
  buyAmount: string
  sellAmount: string
  claimAmount: string
  txCount: number
}

// ============================================================================
// Subscription Payment Types
// ============================================================================

export interface SubscriptionPaymentItem {
  id: string
  chargeCode: string
  hostedUrl: string
  plan: SubscriptionPlanType
  billingCycle: BillingCycleType
  amount: string
  currency: string
  status: PaymentStatusType
  chargeExpiresAt: string
  confirmedAt: string | null
  createdAt: string
}
