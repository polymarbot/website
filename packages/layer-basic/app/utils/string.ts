/**
 * Format a number or string as USD currency
 * Trailing zeros after decimal point are removed (e.g., $1.00 -> $1, $1.50 -> $1.5)
 * @param value - The value to format (number or string)
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency (value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(num)) return '$0'
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num)
  // Remove trailing zeros after decimal point (e.g., $1.00 -> $1, $1.50 -> $1.5)
  return formatted.replace(/\.00$/, '').replace(/(\.\d*?)0+$/, '$1')
}

/**
 * Replaces the middle part of a string with dots, keeping the specified number of characters
 * @param value - The original string
 * @param options - Options to specify how many characters to keep on the left and right
 */
export function replaceMiddleWithDots (
  value: string,
  options?: { left?: number, right?: number },
): string {
  const { left = 5, right = 5 } = options || {}
  if (value.length <= left + right) return value
  return value.replace(
    new RegExp(`^(.{${left}}).*(.{${right}})$`),
    '$1...$2',
  )
}

/**
 * Format Ethereum wallet address for display
 * Keeps first 6 and last 4 characters, replacing middle with dots
 * @param address - The wallet address to format
 * @returns Formatted address (e.g., "0x1234...5678")
 */
export function formatWalletAddress (address: string): string {
  return replaceMiddleWithDots(address, { left: 8, right: 6 })
}

/**
 * Format a decimal value as percentage
 * @param value - The decimal value (e.g., 0.1234 for 12.34%)
 * @returns Formatted percentage string (e.g., "12.34%")
 */
export function formatPercent (value: number): string {
  return `${(value * 100).toFixed(2)}%`
}
