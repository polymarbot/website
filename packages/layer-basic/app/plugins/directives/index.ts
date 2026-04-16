import { vTrim } from './trim'

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.directive('trim', vTrim)
})
