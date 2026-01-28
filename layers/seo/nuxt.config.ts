// SEO layer - Robots, sitemap configuration
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/robots',
    '@nuxtjs/sitemap',
  ],

  robots: {
    disallow: [
      '/__*',
      '/app/',
      '/auth/',
    ],
  },

  site: {
    url: 'https://polymarbot.com',
  },

  sitemap: {
    exclude: [
      new RegExp('components/.*'),
      new RegExp('__.*'),
      new RegExp('/app/.*'),
      new RegExp('/auth/.*'),
    ],
  },
})
