/**
 * Client-side validation utilities
 *
 * Provides helpers for creating validation schemas.
 * Error messages in schemas are encoded as i18n keys and automatically
 * translated by useForm composable.
 */

/**
 * Create a validation schema for a specific API endpoint
 *
 * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param endpoint - API endpoint path
 * @returns Zod schema for the endpoint
 *
 * @example
 * ```ts
 * const schema = createApiValidationSchema('POST', '/api/wallets/import')
 *
 * // Use with useForm (auto-translates i18n keys)
 * const { validate, validationResult } = useForm(formState, { schema })
 * ```
 */
export { createApiValidationSchema } from '#shared/validation/schemas'

export type { ApiMethod, ApiValidationSchemaKey, ApiValidationSchemaReturnType } from '#shared/validation/schemas'
