/**
 * Generate homepage URLs with correct i18n path prefix.
 *
 * app-homepage uses `prefix_except_default` strategy:
 * - default locale (en): /legal/terms-of-service
 * - other locales: /{locale}/legal/terms-of-service
 */
export function useHomepageUrl () {
  const { locale, defaultLocale } = useI18n()
  const runtimeConfig = useRuntimeConfig()

  const origin = computed(() => runtimeConfig.public.homepageOrigin as string)

  /**
   * Build a full homepage URL with locale prefix if needed.
   * @param path - Path without locale prefix (e.g. '/legal/terms-of-service')
   * @param query - Optional query parameters
   */
  function homepageUrl (path: string, query?: Record<string, string>) {
    const prefix = locale.value === defaultLocale ? '' : `/${locale.value}`
    const url = `${origin.value}${prefix}${path}`
    if (!query || Object.keys(query).length === 0) return url
    const params = new URLSearchParams(query).toString()
    return `${url}?${params}`
  }

  return { homepageUrl }
}
