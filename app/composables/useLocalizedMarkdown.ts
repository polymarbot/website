import type { Component } from 'vue'

/**
 * Loads a localized Markdown file based on current i18n locale.
 * Falls back to English (default) if localized version doesn't exist.
 *
 * @param loader - Function that imports the Markdown file with locale suffix
 * @returns Object with `component` (shallowRef) and `loading` (boolean ref)
 *
 * @example
 * const { component, loading } = useLocalizedMarkdown(
 *   (suffix) => import(`./content${suffix}.md`)
 * )
 */
export function useLocalizedMarkdown (
  loader: (localeSuffix: string) => Promise<{ default: Component }>,
) {
  const { locale } = useI18n()

  const component = shallowRef<Component | null>(null)
  const loading = ref(true)

  async function loadContent () {
    loading.value = true
    const suffix = locale.value === 'en' ? '' : `.${locale.value}`

    try {
      const module = await loader(suffix)
      component.value = module.default
    } catch {
      // Fallback to English (no suffix)
      try {
        const module = await loader('')
        component.value = module.default
      } catch (e) {
        console.error('Failed to load markdown content:', e)
        component.value = null
      }
    } finally {
      loading.value = false
    }
  }

  // Load on init and watch locale changes
  watch(locale, loadContent, { immediate: true })

  return { component, loading }
}
