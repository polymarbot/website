import type {
  TradeSide as TradeSideType,
  TradeStepBuy,
  TradeStepSell,
  TradeStep,
  StrategyConfig,
} from '@polymarbot/shared/trade-strategy/types'
import { TradeSide } from '@polymarbot/shared/trade-strategy/types'

// Re-export types for global auto-import
export type { TradeSideType, TradeStepBuy, TradeStepSell, TradeStep, StrategyConfig }
export { TradeSide }

// Re-export normalize utilities for global auto-import
export { normalizeStrategy, hasTradeStepsBuy, stringifyTradeSteps } from '@polymarbot/shared/trade-strategy/normalize'
export type { NormalizeStrategyOptions } from '@polymarbot/shared/trade-strategy/normalize'

/**
 * Calculate the total maximum investment amount for all buy steps in a strategy.
 * Rounds up to two decimal places, with a minimum of 0.01.
 * Examples:
 * - 0.001 => 0.01
 * - 0.021 => 0.03
 * - 0.991 => 1
 *
 * @param strategy - Strategy configuration (array of trade steps)
 * @returns Total maximum investment amount (two decimal places)
 */
export function calculateStrategyMaxAmount (strategy: StrategyConfig): number {
  const total = strategy
    .filter((step): step is TradeStepBuy => step.side === TradeSide.BUY)
    .reduce((sum, step) => sum + (step.size * step.price), 0)
  // Round up to two decimal places, minimum 0.01
  const rounded = Math.ceil(total * 100) / 100
  return Math.max(Number(rounded.toFixed(2)), 0.01)
}
