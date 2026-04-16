/**
 * Check if input is an external link
 * @param input
 */
export function isExternalLink (input: unknown) {
  return /^https?:\/\//.test(input as string)
}
