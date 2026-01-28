<script setup lang="ts">
import type { HtmlAttributes } from '@unhead/vue'

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
  description: () => t('pages.(homepage).tagline'),
})

const { isMobile } = useDevice()
const toastPosition = computed(() => (isMobile.value ? 'top-center' : 'bottom-right'))
const nonProdPosition = computed(() => (isMobile.value ? 'top-right' : 'top-left'))
</script>

<template>
  <EffectNonProd
    :dev="runtimeConfig.public.isDev"
    :stg="runtimeConfig.public.isStg"
    :position="nonProdPosition"
  />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <PrimeToast :position="toastPosition" />
  <PrimeConfirmDialog :closable="false">
    <template #message="{ message }">
      <ModalContent
        :icon="message.icon"
        :content="message.message"
      />
    </template>
  </PrimeConfirmDialog>
</template>
