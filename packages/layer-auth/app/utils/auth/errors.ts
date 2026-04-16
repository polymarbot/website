/**
 * Map better-auth OAuth redirect error codes to our existing error codes.
 * These errors appear in URL ?error= parameter after OAuth failure.
 */
const BETTER_AUTH_ERROR_MAP: Record<string, string> = {
  signup_disabled: 'AUTH_USER_NOT_FOUND',
  please_restart_the_process: 'AUTH_OAUTH_FAILED',
  state_mismatch: 'AUTH_OAUTH_FAILED',
  oAuth_code_missing: 'AUTH_OAUTH_FAILED',
  unable_to_create_user: 'AUTH_OAUTH_FAILED',
  account_not_linked: 'AUTH_OAUTH_FAILED',
  oauth_account_already_linked: 'AUTH_OAUTH_FAILED',
  invalid_callback_request: 'COMMON_VALIDATION_ERROR',
  internal_server_error: 'COMMON_SERVER_ERROR',
}

/**
 * Map a better-auth error code to our error code
 * Returns the original code if no mapping exists
 */
export function mapBetterAuthError (errorCode: string): string {
  return BETTER_AUTH_ERROR_MAP[errorCode] ?? errorCode
}
