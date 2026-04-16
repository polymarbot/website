import {
  generateNuxtConfig,
  getI18nNuxtConfig,
  getSecurityNuxtConfig,
  getSentryNuxtConfig,
  getUiNuxtConfig,
} from '../../nuxt.basic.config'

export default defineNuxtConfig(generateNuxtConfig(
  {
    extends: [ '@polymarbot/layer-basic', '@polymarbot/layer-auth' ],

    ssr: false,

    devServer: { port: 3688 },

    runtimeConfig: {
      public: {
        inviteCodeRequired: process.env.INVITE_CODE_REQUIRED === 'true',
        botBalanceMultiplier: 5,
        homepageOrigin: '',
        gtagId: '',
      },
    },

    app: {
      head: {
        viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
      },
      pageTransition: { name: 'page', mode: 'out-in' },
      layoutTransition: { name: 'layout', mode: 'out-in' },
    },

    nitro: {
      experimental: {
        tasks: true,
      },
      scheduledTasks: {
        // Run subscription enforcement daily at 2:00 AM UTC
        '0 2 * * *': [ 'subscription:enforce-limits' ],
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
    },

    // Route-specific security rules
    routeRules: {
      // Internal APIs - higher rate limit (1000 requests per 5 minutes)
      '/api/internal/**': {
        security: {
          rateLimiter: {
            tokensPerInterval: 1000,
            interval: 300000,
          },
        },
      },
    },

    vite: {
      server: {
        allowedHosts: [ '.trycloudflare.com' ],
      },
    },
  },
  getI18nNuxtConfig([ 'layer-basic', 'layer-auth' ]),
  getSecurityNuxtConfig(),
  getSentryNuxtConfig(),
  getUiNuxtConfig(),
))
