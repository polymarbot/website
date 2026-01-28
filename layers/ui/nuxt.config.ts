// UI layer - PrimeVue configuration
import { resolve } from 'path'

export default defineNuxtConfig({
  modules: [ '@primevue/nuxt-module' ],

  primevue: {
    importTheme: { from: resolve(__dirname, 'theme.ts') },
    components: {
      prefix: 'Prime',
    },
    composables: {
      exclude: [ 'useToast', 'useDialog' ],
    },
  },
})
