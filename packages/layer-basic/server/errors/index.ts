/**
 * Unified error codes for lib utilities
 * These codes should be used by lib functions to return structured errors
 * The calling side (API routes, components) should handle internationalization
 */

// Common errors
const COMMON_ERRORS = {
  COMMON_FORBIDDEN_ERROR: 'COMMON_FORBIDDEN_ERROR',
  COMMON_NETWORK_ERROR: 'COMMON_NETWORK_ERROR',
  COMMON_NOT_FOUND_ERROR: 'COMMON_NOT_FOUND_ERROR',
  COMMON_RATE_LIMIT_EXCEEDED: 'COMMON_RATE_LIMIT_EXCEEDED',
  COMMON_SERVER_ERROR: 'COMMON_SERVER_ERROR',
  COMMON_TIMEOUT_ERROR: 'COMMON_TIMEOUT_ERROR',
  COMMON_UNAUTHORIZED_ERROR: 'COMMON_UNAUTHORIZED_ERROR',
  COMMON_UNKNOWN_ERROR: 'COMMON_UNKNOWN_ERROR',
  COMMON_VALIDATION_ERROR: 'COMMON_VALIDATION_ERROR',
} as const

// Combine all error codes
export const ERROR_CODES = {
  ...COMMON_ERRORS,
} as const

export type ErrorCode = keyof typeof ERROR_CODES
