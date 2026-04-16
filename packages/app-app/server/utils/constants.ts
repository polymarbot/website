/**
 * Execution queue IDs
 */
export const QUEUE_IDS = {
  ENABLE_TRADING: 'enable-trading',
  WALLET_TRANSFER: 'wallet-transfer',
} as const

/**
 * Cache namespace constants
 */
export const CACHE_NS = {
  INTERNAL_BOTS: 'internal-bots',
  INTERNAL_WALLETS: 'internal-wallets',
  DASHBOARD: 'dashboard',
  WALLET: 'wallet',
  BOT: 'bot',
  STRATEGY_RANKINGS: 'strategy-rankings',
  STRATEGY_STATS: 'strategy-stats',
  STRATEGY_STATS_SYMBOL_COUNTS: 'strategy-stats-symbol-counts',
  BRIDGE_ASSETS: 'bridge-assets',
  BRIDGE_QUOTE: 'bridge-quote',
} as const

/**
 * Cache TTL constants (in milliseconds)
 */
export const CACHE_TTL = {
  DASHBOARD_STATS: 30 * 1000, // 30 seconds
  PROFIT_HISTORY: 60 * 1000, // 1 minute
  STRATEGY_RANKINGS: 60 * 60 * 1000, // 1 hour
  STRATEGY_STATS: 60 * 60 * 1000, // 1 hour
  WALLET_BALANCE: 60 * 1000, // 1 minute
  BRIDGE_ASSETS: 60 * 60 * 1000, // 1 hour
  BRIDGE_QUOTE: 30 * 1000, // 30 seconds
} as const

/**
 * Interval to days mapping for APR calculation
 */
export const INTERVAL_DAYS: Record<string, number> = {
  '5m': 5 / 1440,
  '15m': 15 / 1440,
  '1h': 60 / 1440,
  '4h': 240 / 1440,
  '1d': 1,
}
