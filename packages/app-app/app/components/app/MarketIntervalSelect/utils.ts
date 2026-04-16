/**
 * Get formatted interval label
 * @param interval - Market interval type
 * @returns Translated interval label (e.g. "1 Day")
 */
export function getIntervalLabel (interval: MarketIntervalType): string {
  const T = useTranslations('components.app.MarketIntervalSelect')
  return T(`intervals.${interval}`)
}

/**
 * Get formatted interval label with minutes suffix
 * @param interval - Market interval type
 * @returns Translated interval label with minutes (e.g. "1 Day (1440m)")
 */
export function getIntervalLabelWithMinutes (interval: MarketIntervalType): string {
  return `${getIntervalLabel(interval)} (${formatIntervalMinutes(interval)})`
}
