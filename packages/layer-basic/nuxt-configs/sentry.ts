// Sentry module configuration
import type { NuxtConfig } from 'nuxt/config'

export function getSentryNuxtConfig (): NuxtConfig {
  return {
    modules: [ '@sentry/nuxt/module' ],

    runtimeConfig: {
      public: {
        sentryDsn: process.env.SENTRY_DSN,
        sentryEnvironment: process.env.SENTRY_ENVIRONMENT,
      },
    },

    sentry: {
      sourceMapsUploadOptions: {
        org: 'polymarbot',
        project: 'polymarbot-website',
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
    },

    sourcemap: { client: 'hidden' },
  } as NuxtConfig
}
