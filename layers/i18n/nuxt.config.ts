// I18n layer - Internationalization configuration
import { resolve } from 'path'
import i18nLocales from './locales'
import I18nMergePlugin from './build/i18nMergePlugin'
// import { I18nAlignmentChecker } from './build/I18nAlignmentChecker'

const rootDir = resolve(__dirname, '../..')
const messagesDir = resolve(__dirname, 'messages')

export default defineNuxtConfig({
  modules: [ '@nuxtjs/i18n' ],

  i18n: {
    restructureDir: '',
    defaultLocale: 'en',
    locales: i18nLocales,
    langDir: 'messages',
    baseUrl: 'https://polymarbot.com',
    strategy: 'no_prefix',
    experimental: {
      localeDetector: './localeDetector.ts',
    },
  },

  vite: {
    plugins: [
      I18nMergePlugin.vite({
        srcDir: [
          resolve(rootDir, 'app'),
          resolve(rootDir, 'server'),
          resolve(rootDir, 'shared'),
        ],
        srcDirNamespaces: {
          [resolve(rootDir, 'server')]: 'server',
          [resolve(rootDir, 'shared')]: 'shared',
        },
        outputDir: messagesDir,
        languages: [ 'en' ],
        sortOriginalFiles: true,
        async onMergeComplete () {
          // const checker = new I18nAlignmentChecker(messagesDir)
          // const { results } = await checker.check()
          // await checker.fix(results)
        },
      }),
    ],
  },
})
