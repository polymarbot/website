import {
  generateNuxtConfig,
  getI18nNuxtConfig,
} from '../../../nuxt.basic.config'

export default defineNuxtConfig(generateNuxtConfig(
  {
    extends: [ '../../layer-basic', '..' ],
    devServer: { port: 3682 },
  },
  getI18nNuxtConfig([ 'layer-basic' ])
))
