// Security module configuration
import type { NuxtConfig } from 'nuxt/config'

export function getSecurityNuxtConfig (): NuxtConfig {
  return {
    modules: [ 'nuxt-security' ],

    // Rate limiter: 150 requests per 5 minutes per IP
    security: {
      rateLimiter: {
        tokensPerInterval: 150,
        interval: 300000,
        driver: { name: 'lruCache' },
      },
      headers: {
        contentSecurityPolicy: {
          // Disable upgrade-insecure-requests in development to allow HTTP access
          'upgrade-insecure-requests': process.env.APP_ENV !== 'dev',
          // Allow Google and GitHub user avatars
          'img-src': [
            '\'self\'',
            'data:',
            'https://lh3.googleusercontent.com',
            'https://avatars.githubusercontent.com',
          ],
        },
      },
    },
  } as NuxtConfig
}
