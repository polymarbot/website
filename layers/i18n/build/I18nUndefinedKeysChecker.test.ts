/**
 * Integration tests for I18nUndefinedKeysChecker
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import { glob } from 'glob'
import { I18nUndefinedKeysChecker } from './I18nUndefinedKeysChecker'

// Mock fs and glob modules
vi.mock('node:fs')
vi.mock('glob')

describe('I18nUndefinedKeysChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should throw error when en.json is not found', async () => {
    const checker = new I18nUndefinedKeysChecker('/mock/src', '/mock/messages')
    vi.mocked(fs.existsSync).mockReturnValue(false)

    await expect(checker.check()).rejects.toThrow('Translation file not found')
  })

  it('should return empty undefinedKeys array when all keys are defined', async () => {
    const checker = new I18nUndefinedKeysChecker('/mock/src', '/mock/messages')

    // Mock file system
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        common: {
          save: 'Save',
          cancel: 'Cancel',
        },
      }),
    )

    // Mock glob to return no files
    vi.mocked(glob).mockResolvedValue([])

    const result = await checker.check()
    expect(result.undefinedKeys).toEqual([])
    expect(result.statistics.definedKeysCount).toBe(2)
    expect(result.statistics.usageCount).toBe(0)
  })

  it('should detect undefined keys and return statistics', async () => {
    const checker = new I18nUndefinedKeysChecker('/mock/src', '/mock/messages', {
      translationFactories: [ 'useTranslations' ],
    })

    // Mock locale file with defined keys
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
          },
        })
      }
      // Mock source file
      return `const T = useTranslations('common')
T('save')
T('delete')` // 'delete' is undefined
    })

    // Mock glob to return a test file
    vi.mocked(glob).mockResolvedValue([ '/mock/src/test.ts' ])

    const result = await checker.check()
    expect(result.undefinedKeys.length).toBeGreaterThan(0)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'common.delete')).toBe(true)
    expect(result.statistics.definedKeysCount).toBe(1)
    expect(result.statistics.usageCount).toBeGreaterThanOrEqual(1)
  })

  it('should handle complex source files with multiple declarations', async () => {
    const checker = new I18nUndefinedKeysChecker('/mock/src', '/mock/messages')

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('en.json')) {
        return JSON.stringify({
          common: { save: 'Save' },
          app: { title: 'Title' },
        })
      }
      return `const T1 = useTranslations('common')
const T2 = useTranslations('app')
T1('save')
T2('title')
T1('delete') // undefined
T2('subtitle') // undefined`
    })

    vi.mocked(glob).mockResolvedValue([ '/mock/src/complex.ts' ])

    const result = await checker.check()
    expect(result.undefinedKeys.length).toBe(2)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'common.delete')).toBe(true)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'app.subtitle')).toBe(true)
  })

  it('should handle template literal keys with wildcards', async () => {
    const checker = new I18nUndefinedKeysChecker('/mock/src', '/mock/messages')

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('en.json')) {
        return JSON.stringify({
          common: {
            'error.404': 'Not Found',
            'error.500': 'Server Error',
          },
        })
      }
      return 'const T = useTranslations("common")\nconst code = "404"\nT(`error.${code}`)'
    })

    vi.mocked(glob).mockResolvedValue([ '/mock/src/dynamic.ts' ])

    const result = await checker.check()
    // Should not report error for dynamic keys that match pattern
    expect(result.undefinedKeys.length).toBe(0)
  })

  it('should handle vue-i18n useI18n destructuring in real usage', async () => {
    const checker = new I18nUndefinedKeysChecker('/mock/src', '/mock/messages')

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('en.json')) {
        return JSON.stringify({
          common: {
            welcome: 'Welcome',
            goodbye: 'Goodbye',
          },
        })
      }
      return `const { t, te } = useI18n()
t('common.welcome')
t('common.goodbye')
t('common.hello') // undefined
te('common.welcome')`
    })

    vi.mocked(glob).mockResolvedValue([ '/mock/src/component.vue' ])

    const result = await checker.check()
    expect(result.undefinedKeys.length).toBe(1)
    expect(result.undefinedKeys[0]?.fullKey).toBe('common.hello')
    expect(result.undefinedKeys[0]?.functionName).toBe('t')
  })

  it('should handle global methods ($t, $te) without declarations', async () => {
    const checker = new I18nUndefinedKeysChecker('/mock/src', '/mock/messages')

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
          },
        })
      }
      return `// Global methods usage
$t('common.save')
$te('common.cancel')
$t('common.delete') // undefined
$tm('common.messages') // undefined`
    })

    vi.mocked(glob).mockResolvedValue([ '/mock/src/global.vue' ])

    const result = await checker.check()
    expect(result.undefinedKeys.length).toBe(2)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'common.delete')).toBe(true)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'common.messages')).toBe(true)
  })

  it('should handle mixed translation factories and vue-i18n methods', async () => {
    const checker = new I18nUndefinedKeysChecker('/mock/src', '/mock/messages')

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('en.json')) {
        return JSON.stringify({
          common: { save: 'Save', cancel: 'Cancel' },
          app: { title: 'Title' },
          pages: { home: 'Home' },
        })
      }
      return `const T1 = useTranslations('common')
const T2 = useTranslations('app')
const { t } = useI18n()

T1('save') // valid
T2('title') // valid
t('pages.home') // valid
T1('delete') // undefined
t('pages.about') // undefined
$t('common.cancel') // valid global method`
    })

    vi.mocked(glob).mockResolvedValue([ '/mock/src/mixed.ts' ])

    const result = await checker.check()
    expect(result.undefinedKeys.length).toBe(2)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'common.delete')).toBe(true)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'pages.about')).toBe(true)
  })

  it('should handle keypath attribute in Vue templates', async () => {
    const checker = new I18nUndefinedKeysChecker('/mock/src', '/mock/messages')

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('en.json')) {
        return JSON.stringify({
          common: {
            welcome: 'Welcome',
            greeting: 'Hello',
          },
        })
      }
      return `<template>
  <i18n-t keypath="common.welcome" />
  <i18n-t :keypath="'common.greeting'" />
  <i18n-t keypath="common.goodbye" />
  <i18n-t :keypath="'common.farewell'" />
</template>`
    })

    vi.mocked(glob).mockResolvedValue([ '/mock/src/template.vue' ])

    const result = await checker.check()
    expect(result.undefinedKeys.length).toBe(2)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'common.goodbye')).toBe(true)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'common.farewell')).toBe(true)
  })

  it('should handle namespace-less translation factories', async () => {
    const checker = new I18nUndefinedKeysChecker('/mock/src', '/mock/messages')

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('en.json')) {
        return JSON.stringify({
          'page.title': 'Page Title',
          'page.description': 'Description',
        })
      }
      return `const T = useTranslations()
T('page.title')
T('page.description')
T('page.subtitle') // undefined`
    })

    vi.mocked(glob).mockResolvedValue([ '/mock/src/no-namespace.ts' ])

    const result = await checker.check()
    expect(result.undefinedKeys.length).toBe(1)
    expect(result.undefinedKeys[0]?.fullKey).toBe('page.subtitle')
    expect(result.undefinedKeys[0]?.namespace).toBe('')
  })

  it('should handle renamed destructured variables', async () => {
    const checker = new I18nUndefinedKeysChecker('/mock/src', '/mock/messages')

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
          },
        })
      }
      return `const { t: translate, te: exists } = useI18n()
translate('common.save')
exists('common.cancel')
translate('common.delete') // undefined
exists('common.check') // undefined`
    })

    vi.mocked(glob).mockResolvedValue([ '/mock/src/renamed.ts' ])

    const result = await checker.check()
    expect(result.undefinedKeys.length).toBe(2)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'common.delete')).toBe(true)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'common.check')).toBe(true)
  })

  it('should handle multiple files with different patterns', async () => {
    const checker = new I18nUndefinedKeysChecker('/mock/src', '/mock/messages')

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('en.json')) {
        return JSON.stringify({
          common: { save: 'Save' },
          app: { title: 'Title' },
        })
      }
      if (filePath.toString().includes('file1.ts')) {
        return 'const T = useTranslations("common")\nT("save")\nT("delete")'
      }
      if (filePath.toString().includes('file2.vue')) {
        return 'const { t } = useI18n()\nt("app.title")\nt("app.subtitle")'
      }
      if (filePath.toString().includes('file3.vue')) {
        return '$t("common.save")\n$t("common.cancel")'
      }
      return ''
    })

    vi.mocked(glob).mockResolvedValue([
      '/mock/src/file1.ts',
      '/mock/src/file2.vue',
      '/mock/src/file3.vue',
    ])

    const result = await checker.check()
    expect(result.undefinedKeys.length).toBe(3)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'common.delete' && entry.file.includes('file1.ts'))).toBe(true)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'app.subtitle' && entry.file.includes('file2.vue'))).toBe(true)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'common.cancel' && entry.file.includes('file3.vue'))).toBe(true)
  })

  it('should handle nested namespace keys', async () => {
    const checker = new I18nUndefinedKeysChecker('/mock/src', '/mock/messages')

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('en.json')) {
        return JSON.stringify({
          'app.dashboard.title': 'Dashboard',
          'app.dashboard.description': 'Description',
          'common.button.save': 'Save',
          'common.button.cancel': 'Cancel',
        })
      }
      return `const T1 = useTranslations('app.dashboard')
const T2 = useTranslations('common.button')
T1('title')
T1('description')
T1('subtitle') // undefined
T2('save')
T2('delete') // undefined`
    })

    vi.mocked(glob).mockResolvedValue([ '/mock/src/nested.ts' ])

    const result = await checker.check()
    expect(result.undefinedKeys.length).toBe(2)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'app.dashboard.subtitle')).toBe(true)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'common.button.delete')).toBe(true)
  })

  it('should support multiple source directories', async () => {
    const checker = new I18nUndefinedKeysChecker([ '/mock/app', '/mock/server' ], '/mock/messages')

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('en.json')) {
        return JSON.stringify({
          common: { save: 'Save', cancel: 'Cancel' },
          server: { error: 'Error' },
        })
      }
      if (filePath.toString().includes('/mock/app')) {
        return 'const T = useTranslations("common")\nT("save")\nT("delete") // undefined'
      }
      if (filePath.toString().includes('/mock/server')) {
        return 'const T = useTranslations("server")\nT("error")\nT("warning") // undefined'
      }
      return ''
    })

    // Mock glob to return different files for each directory
    vi.mocked(glob)
      .mockResolvedValueOnce([ '/mock/app/page.ts' ]) // First call for /mock/app
      .mockResolvedValueOnce([ '/mock/server/api.ts' ]) // Second call for /mock/server

    const result = await checker.check()
    expect(result.undefinedKeys.length).toBe(2)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'common.delete' && entry.file.includes('app'))).toBe(true)
    expect(result.undefinedKeys.some(entry => entry.fullKey === 'server.warning' && entry.file.includes('server'))).toBe(true)
  })
})
