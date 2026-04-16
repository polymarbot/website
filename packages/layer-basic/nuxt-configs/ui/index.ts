// UI module configuration
import { resolve } from 'path'
import type { NuxtConfig } from 'nuxt/config'

export function getUiNuxtConfig (): NuxtConfig {
  return {
    modules: [ '@primevue/nuxt-module' ],

    // PrimeIcons CSS loaded via nuxt config so Vite can resolve and bundle
    // font assets. CSS @import in Tailwind PostCSS chain skips url() processing.
    css: [ 'primeicons/primeicons.css' ],

    primevue: {
      importTheme: { from: resolve(__dirname, 'theme.ts') },
      components: {
        prefix: 'Prime',
      },
      composables: {
        exclude: [ 'useToast', 'useDialog' ],
      },
    },
  } as NuxtConfig
}
