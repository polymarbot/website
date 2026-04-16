// I18n module - exports config and utilities
import { resolve } from 'path'
import type { NuxtConfig } from 'nuxt/config'
import i18nLocales from './locales'
import { I18n } from '@polymarbot/uitls-shared/plugins'

const __dirname = import.meta.dirname
const packagesDir = resolve(__dirname, '../../..')

/**
 * Generate i18n Nuxt config with specified layer packages.
 * The current app (cwd) is always included automatically as the last merge source.
 *
 * @param packages - Package directory names under `packages/` (e.g. 'layer-basic')
 */
export function getI18nNuxtConfig (packages?: string[]): NuxtConfig {
  const cwd = process.cwd()
  const mergedMessagesDir = resolve(cwd, 'i18n/merged-messages')

  // Build directory configs for each layer package + the current app
  const entries = [
    ...(packages ?? []).map(pkg => {
      const pkgDir = resolve(packagesDir, pkg)
      const appDir = resolve(pkgDir, 'app')
      const serverDir = resolve(pkgDir, 'server')
      const sharedDir = resolve(pkgDir, 'shared')
      return {
        srcDir: [ appDir, serverDir, sharedDir ],
        srcDirNamespaces: { [serverDir]: 'server', [sharedDir]: 'shared' } as Record<string, string>,
        messagesDir: resolve(pkgDir, 'i18n/messages'),
      }
    }),
    // Current app is always the last entry (highest merge priority)
    (() => {
      const serverDir = resolve(cwd, 'server')
      const sharedDir = resolve(cwd, 'shared')
      return {
        srcDir: [ resolve(cwd, 'app'), serverDir, sharedDir ],
        srcDirNamespaces: { [serverDir]: 'server', [sharedDir]: 'shared' } as Record<string, string>,
        messagesDir: resolve(cwd, 'i18n/messages'),
      }
    })(),
  ]

  const needsMerge = (packages ?? []).length > 0
  const allMessagesDirs = entries.map(e => e.messagesDir)

  function mergeAllI18nJsonFiles () {
    I18n.mergeJsonFiles(allMessagesDirs, mergedMessagesDir)
  }

  const plugins = entries.map(({ srcDir, srcDirNamespaces, messagesDir }) =>
    I18n.MergePlugin.vite({
      srcDir,
      srcDirNamespaces,
      outputDir: messagesDir,
      languages: [ 'en' ],
      onMergeComplete: needsMerge ? mergeAllI18nJsonFiles : undefined,
    }),
  )

  return {
    modules: [ '@nuxtjs/i18n' ],

    i18n: {
      restructureDir: '',
      defaultLocale: 'en',
      locales: i18nLocales,
      langDir: needsMerge ? './i18n/merged-messages' : './i18n/messages',
      baseUrl: process.env.APP_ORIGIN,
      strategy: 'no_prefix',
      detectBrowserLanguage: {
        useCookie: true,
        cookieDomain: process.env.COOKIE_DOMAIN || undefined,
      },
      experimental: {
        localeDetector: resolve(__dirname, 'locale-detector.ts'),
      },
    },

    vite: {
      plugins,
    },
  } as NuxtConfig
}
