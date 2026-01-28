/**
 * Global constants for server-side use
 */

export { ERROR_CODES } from '../errors'

/**
 * Execution queue IDs
 */
export const QUEUE_IDS = {
  ENABLE_TRADING: 'enable-trading',
} as const

/**
 * Cache namespace constants
 */
export const CACHE_NS = {
  INTERNAL_BOTS: 'internal-bots',
  INTERNAL_WALLETS: 'internal-wallets',
  DASHBOARD: 'dashboard',
  WALLET_PROFIT: 'wallet-profit',
  BOT_RANKINGS: 'bot-rankings',
  STRATEGY_STATS: 'strategy-stats',
} as const

/**
 * Cache TTL constants (in milliseconds)
 */
export const CACHE_TTL = {
  DASHBOARD_STATS: 30 * 1000, // 30 seconds
  DASHBOARD_RUNTIME: 10 * 1000, // 10 seconds
  DASHBOARD_BALANCE: 60 * 1000, // 1 minute
  PROFIT_HISTORY: 10 * 60 * 1000, // 10 minutes
  BOT_RANKINGS: 60 * 60 * 1000, // 1 hour
  STRATEGY_STATS: 60 * 60 * 1000, // 1 hour
} as const

/**
 * Interval to days mapping for APR calculation
 * APR = profitRate * (365 / activeDays), where activeDays = participated * intervalDays
 */
export const INTERVAL_DAYS: Record<string, number> = {
  '15m': 15 / 1440,
  '1h': 60 / 1440,
  '4h': 240 / 1440,
  '1d': 1,
}
