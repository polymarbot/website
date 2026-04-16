import {
  generateNuxtConfig,
  getI18nNuxtConfig,
} from '../../../nuxt.basic.config'

export default defineNuxtConfig(generateNuxtConfig(
  {
    extends: [ '..' ],
    devServer: { port: 3681 },
  },
  getI18nNuxtConfig([ 'layer-basic' ]),
))
