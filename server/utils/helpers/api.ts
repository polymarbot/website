import type { EventHandler, EventHandlerRequest, H3Event } from 'h3'
import type { ErrorCode } from '../../errors'

/**
 * API error data structure for HTTP response
 */
export interface ApiErrorData {
  code?: string
  details?: unknown
}

/**
 * Internal API Error class
 *
 * Used for throwing errors with i18n keys instead of translated messages.
 * The error message is the error code key (e.g., 'WALLET_NOT_FOUND'),
 * which will be translated in defineWrappedResponseHandler.
 */
export class ApiError extends Error {
  readonly statusCode: number
  readonly code: ErrorCode
  readonly details?: unknown

  constructor (statusCode: number, code: ErrorCode, details?: unknown) {
    super(code) // Use code as message for debugging
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

/**
 * Throw an internal API error
 *
 * This error will be caught by defineWrappedResponseHandler and
 * converted to an internationalized HTTP error.
 *
 * @param statusCode - HTTP status code
 * @param code - Error code from ERROR_CODES
 * @param details - Optional additional error details
 */
export function throwApiError (
  statusCode: number,
  code: ErrorCode,
  details?: unknown,
): never {
  throw new ApiError(statusCode, code, details)
}

/**
 * Enable request logging based on environment variable
 */
const enableLogging = process.env.LOGGING === 'true'

/**
 * Create a wrapped event handler with standardized response format and error handling
 *
 * Automatically handles:
 * - Request logging (when LOGGING=true)
 * - ApiError translation to internationalized HTTP errors
 * - Unknown error handling with generic messages
 *
 * @param handler - The event handler function to wrap
 *
 * @example
 * ```ts
 * export default defineWrappedResponseHandler(async (event) => {
 *   const body = await readBody(event)
 *   // Your logic here - throw ApiError for business errors
 *   if (!wallet) {
 *     throwApiError(404, ERROR_CODES.WALLET_NOT_FOUND)
 *   }
 *   return { userId: 123 }
 * })
 * ```
 */
export const defineWrappedResponseHandler = <T extends EventHandlerRequest, D>(
  handler: (event: H3Event<T>) => Promise<D>,
): EventHandler<T, D> => {
  return defineEventHandler<T>(async event => {
    const startTime = Date.now()
    const path = event.path || 'unknown'
    const method = event.method || 'unknown'

    try {
      // Log request if enabled
      if (enableLogging) {
        console.debug(`[API Request] ${method} ${path}`)
      }

      // Execute the handler
      const result = await handler(event)

      // Log success if enabled
      if (enableLogging) {
        const duration = Date.now() - startTime
        console.debug(`[API Success] ${method} ${path} - ${duration}ms`)
      }

      // Handle different result types
      if (result === null || result === undefined) {
        return
      }

      return result
    } catch (error) {
      console.error(`[API Error] ${method} ${path}:`, error)

      // Get translations for error messages
      const t = await getTranslations(event, 'server.errors')

      // Handle internal ApiError - translate and convert to HTTP error
      if (error instanceof ApiError) {
        throw createError<ApiErrorData>({
          statusCode: error.statusCode,
          message: t(error.code),
          data: {
            code: error.code,
            details: error.details,
          },
        })
      }

      // Handle H3 errors (errors created with createError)
      if (error && typeof error === 'object' && 'statusCode' in error) {
        const h3Error = error as { statusCode: number, message?: string, data?: ApiErrorData }
        const errorData = h3Error.data

        // If already in standardized format with code, re-throw as is
        if (errorData?.code) {
          throw h3Error
        }

        // Convert to standardized format
        throw createError<ApiErrorData>({
          statusCode: h3Error.statusCode || 500,
          message: h3Error.message || t(ERROR_CODES.COMMON_UNKNOWN_ERROR),
          data: {
            code: ERROR_CODES.COMMON_UNKNOWN_ERROR,
            details: errorData?.details,
          },
        })
      }

      // Handle unknown errors - use generic message, keep details for debugging
      throw createError<ApiErrorData>({
        statusCode: 500,
        message: t(ERROR_CODES.COMMON_UNKNOWN_ERROR),
        data: {
          code: ERROR_CODES.COMMON_UNKNOWN_ERROR,
          details: error instanceof Error ? error.message : String(error),
        },
      })
    }
  })
}
