import type { HtmlAttributes } from '@unhead/vue'

/**
 * Composable for SEO head management including i18n support
 * Handles html attributes, alternate links, and SEO meta tags
 */
export function useSeoHead () {
  const runtimeConfig = useRuntimeConfig()
  const route = useRoute()
  const i18nHead = useLocaleHead()
  const { t, te } = useI18n()

  const title = computed(() => {
    const appTitle = runtimeConfig.public.appName
    const routeTitle = route.meta.title as string | undefined
    if (routeTitle && te(routeTitle)) {
      return `${t(routeTitle)} | ${appTitle}`
    } else {
      return appTitle
    }
  })

  // i18n head (lang, dir, alternate links, og:locale)
  useHead({
    htmlAttrs: {
      lang: () => i18nHead.value.htmlAttrs?.lang,
      dir: () => i18nHead.value.htmlAttrs?.dir as HtmlAttributes['dir'],
    },
    link: () => i18nHead.value.link || [],
    meta: () => i18nHead.value.meta || [],
  })

  useSeoMeta({
    title,
  })

  return {
    title,
  }
}
