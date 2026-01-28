/**
 * Composable for syncing filters with URL query parameters
 *
 * @example
 * const filters = useFilters({
 *   keyword: '',
 *   status: null,
 * })
 *
 * filters.keyword = 'test' // URL: ?keyword=test
 */
export default function useFilters<T extends Record<string, any>> (defaults: T): T {
  const route = useRoute()
  const router = useRouter()

  // Initialize from URL query
  const initial = { ...defaults }
  for (const key of Object.keys(defaults)) {
    const queryValue = route.query[key]
    if (queryValue !== undefined) {
      initial[key as keyof T] = queryValue as T[keyof T]
    }
  }

  const filters = reactive(initial) as T

  // Sync to URL when filters change
  watch(
    () => ({ ...filters }),
    newFilters => {
      // Merge existing query params with filter params, remove empty values
      const merged = { ...route.query, ...newFilters }
      const query: Record<string, string> = {}

      for (const [ key, value ] of Object.entries(merged)) {
        if (value !== undefined && value !== null && value !== '') {
          query[key] = String(value)
        }
      }

      router.replace({ query })
    },
    { deep: true, immediate: true },
  )

  // Sync from URL when route query changes (browser back/forward)
  watch(
    () => route.query,
    newQuery => {
      for (const key of Object.keys(defaults)) {
        const queryValue = newQuery[key]
        if (queryValue !== undefined) {
          filters[key as keyof T] = queryValue as T[keyof T]
        } else {
          filters[key as keyof T] = defaults[key]
        }
      }
    },
    { immediate: true },
  )

  return filters
}
