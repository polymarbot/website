import { defu } from 'defu'
import type { NuxtConfig } from 'nuxt/schema'
import { getI18nNuxtConfig } from './packages/layer-basic/nuxt-configs/i18n'
import { getSecurityNuxtConfig } from './packages/layer-basic/nuxt-configs/security'
import { getSeoNuxtConfig } from './packages/layer-basic/nuxt-configs/seo'
import { getSentryNuxtConfig } from './packages/layer-basic/nuxt-configs/sentry'
import { getUiNuxtConfig } from './packages/layer-basic/nuxt-configs/ui'
import { join } from 'node:path'

const currentDir = import.meta.dirname

/** Shared Nuxt config for app sub-projects */
const baseConfig: NuxtConfig = {
  modules: [ '@nuxt/eslint' ],

  runtimeConfig: {
    public: {
      appName: process.env.APP_NAME,
      isDev: process.env.APP_ENV === 'dev',
      isStg: process.env.APP_ENV === 'stg',
      turnstileSiteKey: process.env.CLOUDFLARE_TURNSTILE_SITE_KEY || '',
      cookieDomain: process.env.COOKIE_DOMAIN || '',
    },
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      // Pre-declare CSS layer order to fix PrimeVue SSR FOUC issue
      // See: https://github.com/primefaces/primevue/issues/6529
      style: [
        { textContent: '@layer theme, base, primevue;' },
      ],
    },
  },

  css: [ '~/assets/styles/globals.css' ],

  components: [
    { path: '~/components/ui', pathPrefix: false },
    { path: '~/components', pathPrefix: true },
  ],

  imports: {
    dirs: [
      'composables/**',
      'types/**',
      'utils/**',
    ],
  },

  alias: {
    '@root': currentDir,
    '@packages': join(currentDir, 'packages'),
    'lodash': 'lodash-es',
  },

  nitro: {
    experimental: {
      asyncContext: true,
    },
    esbuild: {
      options: {
        target: 'es2020',
      },
    },
  },

  hooks: {
    // @ts-expect-error nitro:config hook type from @nuxt/nitro-server not in scope
    // Suppress duplicate auto-import warnings from Nuxt layers (https://github.com/nuxt/nuxt/issues/28006)
    'nitro:config': (config: { imports?: { warn?: (msg: string) => void }}) => {
      config.imports = config.imports || {}
      config.imports.warn = (msg: string) => {
        if (!msg.startsWith('Duplicated imports'))
          console.warn(msg)
      }
    },
  },

  vite: {
    vue: {
      script: {
        // Disable props type resolution to avoid errors with external library types
        // that extend native HTML attributes (e.g., PrimeVue's ButtonProps)
        propsDestructure: true,
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
    },
    esbuild: {
      drop: [ 'debugger' ],
      pure: [ 'console.log' ],
    },
  },

  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
      'postcss-pxtorem': {
        rootValue: 14,
        propList: [
          '*size*',
          '*width*',
          '*height*',
          '*margin*',
          '*padding*',
          'background*',
          'flex*',
          'grid*',
          '*top',
          '*left',
          '*right',
          '*bottom',
          '*radius',
          'font',
          'letter-spacing',
          'box-shadow',
        ],
        selectorBlackList: [ 'html', 'body' ],
        minPixelValue: 2,
      },
    },
  },

  devtools: { enabled: false },
  compatibilityDate: '2026-01-31',
}

/**
 * Generate Nuxt config with shared defaults for app sub-projects.
 * Uses defu to merge configs (first config has highest priority).
 */
export function generateNuxtConfig (...configs: [NuxtConfig, ...NuxtConfig[]]): NuxtConfig {
  return defu(...configs, baseConfig) as NuxtConfig
}

export { getI18nNuxtConfig, getSecurityNuxtConfig, getSeoNuxtConfig, getSentryNuxtConfig, getUiNuxtConfig }
