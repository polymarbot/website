export {
  generateMarketUrl,
  generate15mSlug,
  generate1hSlug,
  generate4hSlug,
  generate1dSlug,
  calculatePeriodStartInET,
  parseSymbolFromSlug,
  parseIntervalFromSlug,
  parseTimeRangeFromSlug,
  parseSlug,
  getIntervalSeconds,
} from '@polymarbot/shared/markets/utils'

// Interval to minutes mapping
const INTERVAL_MINUTES: Record<MarketIntervalType, number> = {
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
 * e.g., "15m" -> "15m", "1h" -> "60m", "4h" -> "240m", "1d" -> "1440m"
 */
export function formatIntervalMinutes (interval: MarketIntervalType): string {
  return `${INTERVAL_MINUTES[interval]}m`
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
