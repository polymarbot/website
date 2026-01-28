/**
 * Error message extraction utility
 *
 * Provides a robust way to extract user-friendly error messages from various error objects.
 */

/**
 * Extract error message from any error-like object
 *
 * Supports multiple error formats:
 * - better-auth errors: { code, message }
 * - API errors: { data: { code, message } }
 * - FetchError: { data: { code, message }, message }
 * - Standard Error: { message }
 * - String errors
 *
 * @param error - Any error-like object
 * @param t - i18n translation function
 * @param te - i18n translation exists function
 * @returns User-friendly error message
 */
export function getErrorMessage (
  error: unknown,
  t: (key: string) => string,
  te: (key: string) => boolean,
): string {
  // Handle null/undefined
  if (!error) {
    return t('server.errors.COMMON_UNKNOWN_ERROR')
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error
  }

  // Handle error-like objects
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>

    // Try to extract error code from various locations
    const errorCode = extractErrorCode(err)

    // If we have an error code, try to get i18n message
    if (errorCode) {
      const i18nKey = `server.errors.${errorCode}`
      if (te(i18nKey)) {
        return t(i18nKey)
      }
    }

    // Try to extract message from various locations
    const message = extractErrorMessage(err)
    if (message) {
      return message
    }
  }

  // Fallback to unknown error
  return t('server.errors.COMMON_UNKNOWN_ERROR')
}

/**
 * Extract error code from error object
 * Checks multiple possible locations where error code might be stored
 */
function extractErrorCode (error: Record<string, unknown>): string | undefined {
  // Direct code property (better-auth style)
  if (typeof error.code === 'string' && error.code) {
    return error.code
  }

  // Nested in data (API response style)
  if (error.data && typeof error.data === 'object') {
    const data = error.data as Record<string, unknown>
    if (typeof data.code === 'string' && data.code) {
      return data.code
    }
  }

  // Nested in error property
  if (error.error && typeof error.error === 'object') {
    const nested = error.error as Record<string, unknown>
    if (typeof nested.code === 'string' && nested.code) {
      return nested.code
    }
  }

  // Nested in response.data (axios style)
  if (error.response && typeof error.response === 'object') {
    const response = error.response as Record<string, unknown>
    if (response.data && typeof response.data === 'object') {
      const data = response.data as Record<string, unknown>
      if (typeof data.code === 'string' && data.code) {
        return data.code
      }
    }
  }

  return undefined
}

/**
 * Extract error message from error object
 * Checks multiple possible locations where error message might be stored
 */
function extractErrorMessage (error: Record<string, unknown>): string | undefined {
  // Direct message property
  if (typeof error.message === 'string' && error.message) {
    return error.message
  }

  // Nested in data (API response style)
  if (error.data && typeof error.data === 'object') {
    const data = error.data as Record<string, unknown>
    if (typeof data.message === 'string' && data.message) {
      return data.message
    }
  }

  // Nested in error property
  if (error.error && typeof error.error === 'object') {
    const nested = error.error as Record<string, unknown>
    if (typeof nested.message === 'string' && nested.message) {
      return nested.message
    }
  }

  // statusMessage (H3/Nitro style)
  if (typeof error.statusMessage === 'string' && error.statusMessage) {
    return error.statusMessage
  }

  return undefined
}
