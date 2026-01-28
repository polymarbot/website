/**
 * Server-side validation utilities
 *
 * Provides helpers for validating API request data using shared Zod schemas.
 */

import type { H3Event } from 'h3'
import { z } from 'zod'
import {
  createApiValidationSchema,
  type ApiMethod,
  type ApiValidationSchemaKey,
  type ApiValidationSchemaReturnType,
} from '#shared/validation/schemas'

/** Infer data type from schema key */
type ApiDataType<K extends ApiValidationSchemaKey> = z.infer<ApiValidationSchemaReturnType<K>>

/**
 * Validate request data using shared API schema
 *
 * @param data - Data to validate (from body, query, or any source)
 * @param method - HTTP method (GET, POST, PUT, PATCH)
 * @param endpoint - API endpoint path
 * @returns Parsed and validated data
 * @throws ApiError with 400 status if validation fails
 *
 * @example
 * ```ts
 * // Validate request body
 * const body = await readBody(event)
 * const data = validateRequestData(body, 'POST', '/api/wallets/import')
 *
 * // Validate query parameters
 * const query = getQuery(event)
 * const data = validateRequestData(query, 'GET', '/api/wallets/export')
 * ```
 */
export function validateRequestData<
  M extends ApiMethod,
  E extends string,
  K extends `${M} ${E}` & ApiValidationSchemaKey = `${M} ${E}` & ApiValidationSchemaKey,
> (
  data: unknown,
  method: M,
  endpoint: E,
): ApiDataType<K> {
  const schema = createApiValidationSchema(method, endpoint)

  // Handle null/undefined data - treat as empty object for validation
  const normalizedData = data ?? {}

  try {
    return schema.parse(normalizedData) as ApiDataType<K>
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Pass validation issues as details, the i18n key is in the message
      throwApiError(400, ERROR_CODES.COMMON_VALIDATION_ERROR, {
        issues: error.issues,
        // Store the raw message (i18n key) for potential frontend translation
        rawMessage: error.issues[0]?.message,
      })
    }
    throw error
  }
}

/**
 * Validate and extract a required route parameter
 *
 * @param event - H3 event
 * @param paramName - The parameter name to extract (e.g., 'id', 'funder')
 * @returns The parameter value
 * @throws ApiError with 400 status if parameter is missing
 *
 * @example
 * ```ts
 * const id = validateRequestParams(event, 'id')
 * ```
 */
export function validateRequestParams (
  event: H3Event,
  paramName: string,
): string {
  const value = getRouterParam(event, paramName)

  if (!value) {
    throwApiError(400, ERROR_CODES.COMMON_VALIDATION_ERROR)
  }

  return value
}

export { createApiValidationSchema }

export type { ApiMethod, ApiValidationSchemaKey, ApiValidationSchemaReturnType }
