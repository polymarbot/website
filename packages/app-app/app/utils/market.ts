export {
  generateMarketUrl,
  generate5mSlug,
  generate15mSlug,
  generate1hSlug,
  generate4hSlug,
  generate1dSlug,
  parseSymbolFromSlug,
  parseIntervalFromSlug,
  parseTimeRangeFromSlug,
  parseSlug,
  getIntervalSeconds,
} from '@polymarbot/shared/markets/utils'

const POLYMARKET_BASE_URL = 'https://polymarket.com'

// Interval to minutes mapping
const INTERVAL_MINUTES: Record<MarketIntervalType, number> = {
  [MarketInterval.M5]: 5,
  [MarketInterval.M15]: 15,
  [MarketInterval.H1]: 60,
  [MarketInterval.H4]: 240,
  [MarketInterval.D1]: 1440,
}

/**
 * Get interval duration in minutes
 */
export function getIntervalMinutes (interval: MarketIntervalType): number {
  return INTERVAL_MINUTES[interval]
}

/**
 * Convert interval type to minutes representation string
 * e.g., "5m" -> "5m", "1h" -> "60m", "1d" -> "1440m"
 */
export function formatIntervalMinutes (interval: MarketIntervalType): string {
  return `${INTERVAL_MINUTES[interval]}m`
}

/**
 * Get Polymarket profile URL for a wallet address
 */
export function getPolymarketProfileUrl (address: string): string {
  return `${POLYMARKET_BASE_URL}/${address}`
}

/**
 * Get symbol image URL
 */
export function getSymbolImage (symbol: MarketSymbolType) {
  return `/img/symbol/${symbol}.webp`
}

/**
 * Get symbol display name
 */
export function getSymbolName (symbol: MarketSymbolType) {
  return symbol.toUpperCase()
}
