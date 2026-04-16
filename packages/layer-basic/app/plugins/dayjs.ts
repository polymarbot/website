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

// Only map locale codes that differ between app and dayjs
const localeMap: Record<string, string> = {
  'zh-CN': 'zh-cn',
  'zh-TW': 'zh-tw',
}

// Glob all dayjs locale files for lazy loading
const localeFiles = import.meta.glob<{ default: ILocale }>('../../node_modules/dayjs/esm/locale/*.js')

/**
 * Resolve app locale to dayjs locale code
 */
function getDayjsLocale (appLocale: string): string {
  return localeMap[appLocale] || appLocale.toLowerCase()
}

/**
 * Set dayjs locale with lazy loading
 */
async function setDayjsLocale (appLocale: string): Promise<void> {
  const dayjsLocale = getDayjsLocale(appLocale)
  const localeLoader = localeFiles[`../../node_modules/dayjs/esm/locale/${dayjsLocale}.js`]
  if (localeLoader) {
    try {
      const res = await localeLoader()
      dayjs.locale(res.default)
    } catch (err) {
      console.error(`Failed to load dayjs locale: ${dayjsLocale}`, err)
    }
  }
}

export default defineNuxtPlugin(nuxtApp => {
  const i18n = nuxtApp.$i18n as { locale: Ref<string, string> }

  // Sync dayjs locale with app locale (runs once at app level)
  watch(i18n.locale, async newLocale => {
    await setDayjsLocale(newLocale)
  }, { immediate: true })
})
