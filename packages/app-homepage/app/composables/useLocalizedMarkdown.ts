import type { Component } from 'vue'

/**
 * Loads a localized Markdown file based on current i18n locale.
 * Falls back to English (default) if localized version doesn't exist.
 *
 * Must be called with `await` to ensure content is rendered during SSG.
 *
 * @example
 * const ContentMd = await useLocalizedMarkdown(
 *   suffix => import(`./content${suffix}.md`),
 * )
 */
export async function useLocalizedMarkdown (
  loader: (localeSuffix: string) => Promise<{ default: Component }>,
) {
  const { locale } = useI18n()
  const suffix = locale.value === 'en' ? '' : `.${locale.value}`

  try {
    return (await loader(suffix)).default
  } catch {
    return (await loader('')).default
  }
}
