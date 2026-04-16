import type { LocaleObject } from '@nuxtjs/i18n'

const locales: LocaleObject[] = [
  { code: 'ar', language: 'ar-SA', name: 'العربية', file: 'ar.json' },
  { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json' },
  { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
  { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' },
  { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
  { code: 'hi', language: 'hi-IN', name: 'हिन्दी', file: 'hi.json' },
  { code: 'id', language: 'id-ID', name: 'Bahasa Indonesia', file: 'id.json' },
  { code: 'it', language: 'it-IT', name: 'Italiano', file: 'it.json' },
  { code: 'ja', language: 'ja-JP', name: '日本語', file: 'ja.json' },
  { code: 'ko', language: 'ko-KR', name: '한국어', file: 'ko.json' },
  { code: 'nl', language: 'nl-NL', name: 'Nederlands', file: 'nl.json' },
  { code: 'pl', language: 'pl-PL', name: 'Polski', file: 'pl.json' },
  { code: 'pt', language: 'pt-BR', name: 'Português', file: 'pt.json' },
  { code: 'ru', language: 'ru-RU', name: 'Русский', file: 'ru.json' },
  { code: 'th', language: 'th-TH', name: 'ไทย', file: 'th.json' },
  { code: 'tr', language: 'tr-TR', name: 'Türkçe', file: 'tr.json' },
  { code: 'vi', language: 'vi-VN', name: 'Tiếng Việt', file: 'vi.json' },
  { code: 'zh-CN', language: 'zh-CN', name: '简体中文', file: 'zh-CN.json' },
  { code: 'zh-TW', language: 'zh-TW', name: '繁體中文', file: 'zh-TW.json' },
] as const

export type LocaleCode = (typeof locales)[number]['code']
export const LOCALE_CODES = locales.map(l => l.code) as [LocaleCode, ...LocaleCode[]]

/**
 * Resolve a BCP 47 locale string (e.g. "zh-CN", "en-US", "ja") to a supported locale code.
 * Matching priority: exact match > primary subtag match > fallback 'en'.
 *
 * @param locale - Browser locale string (e.g. navigator.language)
 * @param supportedCodes - List of supported locale codes (from locales.ts)
 */
export function resolveLocaleCode (locale: string, supportedCodes: string[]): string {
  const normalized = locale.toLowerCase().replace('_', '-')

  // Exact match (e.g. "zh-cn" matches "zh-CN")
  const exact = supportedCodes.find(code => code.toLowerCase() === normalized)
  if (exact) return exact

  // Primary subtag match (e.g. "zh" from "zh-TW" matches "zh-CN")
  const primary = normalized.split('-')[0]
  const partial = supportedCodes.find(code => code.toLowerCase().split('-')[0] === primary)
  if (partial) return partial

  return 'en'
}

/**
 * Get locale name by code
 */
export function getLocaleNameByCode (code: string): string {
  return locales.find(l => l.code === code)?.name ?? code
}

export default locales
