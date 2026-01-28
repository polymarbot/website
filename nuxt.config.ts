import tailwindcss from '@tailwindcss/vite'
import Markdown from 'unplugin-vue-markdown/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      appName: process.env.APP_NAME,
      isDev: process.env.APP_ENV === 'dev',
      isStg: process.env.APP_ENV === 'stg',
      inviteCodeRequired: process.env.INVITE_CODE_REQUIRED === 'true',
      botBalanceMultiplier: 10,
      turnstileSiteKey: process.env.CLOUDFLARE_TURNSTILE_SITE_KEY || '',
      sentryDsn: '',
      gtagId: '',
    },
  },

  css: [ '~/assets/styles/globals.css' ],

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      script: [
        {
          // Prevent dark mode flash by applying theme before any rendering
          innerHTML: '(function(){var d=document.cookie.match(/darkMode=([^;]+)/);var v=d?d[1]:null;if(v===null||v===\'true\'){document.documentElement.classList.add(\'dark\')}else{document.documentElement.classList.remove(\'dark\')}})()',
          tagPosition: 'head',
        },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },

  modules: [
    '@nuxt/eslint',
  ],

  nitro: {
    experimental: {
      asyncContext: true,
      tasks: true,
    },
    scheduledTasks: {
      // Run subscription expiration check daily at 2:00 AM UTC
      '0 2 * * *': [ 'subscription:check-expired' ],
    },
    storage: {
      cache: {
        driver: 'lruCache',
        max: 10000,
      },
      rateLimit: {
        driver: 'lruCache',
        max: 1000,
      },
    },
    esbuild: {
      options: {
        target: 'es2020',
      },
    },
  },

  routeRules: {
    '/app/**': { ssr: false },
    '/auth/**': { ssr: false },
  },

  alias: {
    lodash: 'lodash-es',
  },

  components: [
    {
      path: '~/components',
      pathPrefix: true,
    },
    {
      path: '~/components/ui',
      pathPrefix: false,
    },
  ],

  imports: {
    dirs: [
      'composables/**', // app/composables deep scan
      'types/**', // app/types deep scan
      'utils/**', // app/utils deep scan
    ],
  },

  vite: {
    server: {
      allowedHosts: [ '.trycloudflare.com' ],
    },
    vue: {
      include: [ /\.vue$/, /\.md$/ ],
      script: {
        // Disable props type resolution to avoid errors with external library types
        // that extend native HTML attributes (e.g., PrimeVue's ButtonProps)
        propsDestructure: true,
      },
    },
    plugins: [
      tailwindcss(),
      Markdown({
        wrapperClasses: null,
      }),
    ],
    build: {
      chunkSizeWarningLimit: 1000,
    },
    esbuild: {
      drop: [ 'debugger' ],
      pure: [ 'console.log' ],
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use \'~/assets/styles/mixin\';',
        },
      },
    },
  },

  devServer: {
    port: 3688,
  },
  sourcemap: process.env.APP_ENV !== 'prod',
  devtools: { enabled: false },
  compatibilityDate: '2025-07-15',
})
