import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import duration from 'dayjs/plugin/duration'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Extend dayjs with plugins
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
dayjs.extend(duration)
dayjs.extend(utc)
dayjs.extend(timezone)

// Mapping from app locale codes to dayjs locale codes
const localeToDayjsLocale: Record<string, string> = {
  'en': 'en',
  'es': 'es',
  'ja': 'ja',
  'zh-CN': 'zh-cn',
  'zh-TW': 'zh-tw',
}

// Cache for loaded locales
const loadedLocales = new Set<string>([ 'en' ]) // English is built-in

/**
 * Lazy load dayjs locale file
 */
async function loadDayjsLocale (dayjsLocale: string): Promise<void> {
  if (loadedLocales.has(dayjsLocale)) {
    return
  }

  try {
    // Dynamic import for locale files
    switch (dayjsLocale) {
      case 'es':
        await import('dayjs/locale/es')
        break
      case 'ja':
        await import('dayjs/locale/ja')
        break
      case 'zh-cn':
        await import('dayjs/locale/zh-cn')
        break
      case 'zh-tw':
        await import('dayjs/locale/zh-tw')
        break
    }
    loadedLocales.add(dayjsLocale)
  } catch (err) {
    console.error(`Failed to load dayjs locale: ${dayjsLocale}`, err)
  }
}

/**
 * Get dayjs locale code from app locale code
 */
export function getDayjsLocale (appLocale: string): string {
  return localeToDayjsLocale[appLocale] ?? 'en'
}

/**
 * Set dayjs locale with lazy loading
 */
export async function setDayjsLocale (appLocale: string): Promise<void> {
  const dayjsLocale = getDayjsLocale(appLocale)
  await loadDayjsLocale(dayjsLocale)
  dayjs.locale(dayjsLocale)
}

export default defineNuxtPlugin(() => {
  return {
    provide: {
      dayjs,
    },
  }
})
