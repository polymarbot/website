import {
  generateNuxtConfig,
  getI18nNuxtConfig,
  getSeoNuxtConfig,
  getSentryNuxtConfig,
  getUiNuxtConfig,
} from '../../nuxt.basic.config'
import Markdown from 'unplugin-vue-markdown/vite'

export default defineNuxtConfig(generateNuxtConfig(
  {
    extends: [ '@polymarbot/layer-basic' ],

    devServer: { port: 3680 },

    nitro: {
      preset: 'static',
      prerender: {
        ignore: [ /sitemap\.xml/ ],
      },
    },

    pages: {
      pattern: [ '**/*.vue', '!**/components/**' ],
    },

    runtimeConfig: {
      public: {
        appOrigin: '',
        gtagId: '',
      },
    },

    i18n: {
      strategy: 'prefix_except_default',
    },

    app: {
      head: {
        viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
      },
    },

    vite: {
      vue: {
        include: [ /\.vue$/, /\.md$/ ],
      },
      plugins: [
        // @ts-ignore
        Markdown({
          wrapperClasses: null,
        }),
      ],
    },
  },
  getI18nNuxtConfig([ 'layer-basic' ]),
  getSeoNuxtConfig(),
  getSentryNuxtConfig(),
  getUiNuxtConfig(),
))
