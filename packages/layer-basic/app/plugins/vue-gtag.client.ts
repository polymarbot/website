import { createGtag } from 'vue-gtag'

export default defineNuxtPlugin(nuxtApp => {
  const runtimeConfig = useRuntimeConfig()
  if (!runtimeConfig.public.gtagId) return

  const gtag = createGtag({
    tagId: runtimeConfig.public.gtagId as string,
  })
  nuxtApp.vueApp.use(gtag)
})
