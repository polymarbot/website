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

export default locales
