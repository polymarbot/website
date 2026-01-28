// Security layer - Rate limiting and security headers
export default defineNuxtConfig({
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
        // Allow Google user avatars
        'img-src': [ '\'self\'', 'data:', 'https://lh3.googleusercontent.com' ],
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
})
