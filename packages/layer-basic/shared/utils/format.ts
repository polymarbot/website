/**
 * Format a number to fixed decimal places, removing trailing zeros.
 * formatDecimal(1.501, 2)   => '1.5'
 * formatDecimal(2.051, 2)   => '2.05'
 * formatDecimal('3.10', 1)  => '3.1'
 */
export function formatDecimal (value: number | string, decimals: number): string {
  return parseFloat(Number(value).toFixed(decimals)).toString()
}
