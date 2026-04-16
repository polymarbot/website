import type { H3Event } from 'h3'

/**
 * Get cleaned query parameters from the request
 *
 * Removes empty string values from query parameters,
 * since URL query strings convert null/undefined to empty strings.
 */
export function getCleanQuery (event: H3Event): Record<string, unknown> {
  const query = getQuery(event)
  const cleaned: Record<string, unknown> = {}

  for (const [ key, value ] of Object.entries(query)) {
    if (value !== '') {
      cleaned[key] = value
    }
  }

  return cleaned
}
