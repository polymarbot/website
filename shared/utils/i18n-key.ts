/**
 * I18n Key Encoding/Decoding Utilities
 *
 * Provides utilities for encoding i18n keys with optional parameters into a string format,
 * and decoding them back for translation. This allows validation schemas to be decoupled
 * from i18n translation functions.
 *
 * Format:
 * - Without params: "i18n:shared.validation.email.invalid"
 * - With params: "i18n:shared.validation.walletName.tooLong:{"maximum":100}"
 */

import type { I18nTranslatorFn } from '~~/shared/types/i18n'

const I18N_PREFIX = 'i18n:'

/**
 * Encode an i18n key with optional parameters into a string
 *
 * @param key - The i18n translation key
 * @param params - Optional parameters for interpolation
 * @returns Encoded string in format "i18n:key" or "i18n:key:{params}"
 *
 * @example
 * ```ts
 * encodeI18nKey('shared.validation.email.invalid')
 * // => "i18n:shared.validation.email.invalid"
 *
 * encodeI18nKey('shared.validation.walletName.tooLong', { maximum: 100 })
 * // => "i18n:shared.validation.walletName.tooLong:{\"maximum\":100}"
 * ```
 */
export function encodeI18nKey (key: string, params?: Record<string, unknown>): string {
  if (params && Object.keys(params).length > 0) {
    return `${I18N_PREFIX}${key}:${JSON.stringify(params)}`
  }
  return `${I18N_PREFIX}${key}`
}

/**
 * Check if a string is an encoded i18n key
 *
 * @param value - String to check
 * @returns true if the string starts with "i18n:" prefix
 */
export function isI18nKey (value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(I18N_PREFIX)
}

/**
 * Decoded i18n key structure
 */
export interface DecodedI18nKey {
  key: string
  params?: Record<string, unknown>
}

/**
 * Decode an encoded i18n key string
 *
 * @param encoded - Encoded i18n key string
 * @returns Decoded key and optional parameters
 *
 * @example
 * ```ts
 * decodeI18nKey('i18n:shared.validation.email.invalid')
 * // => { key: 'shared.validation.email.invalid' }
 *
 * decodeI18nKey('i18n:shared.validation.walletName.tooLong:{"maximum":100}')
 * // => { key: 'shared.validation.walletName.tooLong', params: { maximum: 100 } }
 * ```
 */
export function decodeI18nKey (encoded: string): DecodedI18nKey {
  if (!isI18nKey(encoded)) {
    return { key: encoded }
  }

  const content = encoded.slice(I18N_PREFIX.length)
  const colonIndex = content.indexOf(':')

  if (colonIndex === -1) {
    return { key: content }
  }

  const key = content.slice(0, colonIndex)
  const paramsStr = content.slice(colonIndex + 1)

  try {
    return { key, params: JSON.parse(paramsStr) }
  } catch {
    // If JSON parsing fails, treat the whole content as the key
    return { key: content }
  }
}

/**
 * Translate an i18n key if it's encoded, otherwise return as-is
 *
 * @param value - String that may be an encoded i18n key
 * @param t - Translation function
 * @returns Translated string or original value
 *
 * @example
 * ```ts
 * const t = (key, params) => `translated: ${key}`
 *
 * translateI18nKey('i18n:shared.validation.email.invalid', t)
 * // => "translated: shared.validation.email.invalid"
 *
 * translateI18nKey('Plain error message', t)
 * // => "Plain error message"
 * ```
 */
export function translateI18nKey (value: string, t: I18nTranslatorFn): string {
  if (!isI18nKey(value)) {
    return value
  }

  const { key, params } = decodeI18nKey(value)
  return params ? t(key, params) : t(key)
}
