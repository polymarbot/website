// SEO module configuration
import type { NuxtConfig } from 'nuxt/config'

export function getSeoNuxtConfig (): NuxtConfig {
  return {
    modules: [
      '@nuxtjs/robots',
      '@nuxtjs/sitemap',
    ],

    robots: {
      disallow: [
        '/__*',
      ],
    },

    site: {
      url: process.env.APP_ORIGIN,
    },

    sitemap: {
      exclude: [
        '/**/components/**',
        '/**/__**',
      ],
    },
  } as NuxtConfig
}
