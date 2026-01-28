/**
 * Integration tests for I18nUnusedKeysChecker
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import { glob } from 'glob'
import { I18nUnusedKeysChecker } from './I18nUnusedKeysChecker'

// Mock fs and glob modules
vi.mock('node:fs')
vi.mock('glob')

describe('I18nUnusedKeysChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should throw error when en.json is not found in localesDir', async () => {
    const checker = new I18nUnusedKeysChecker('/mock/src', '/mock/messages')

    // Mock glob to return empty array for namespace map building
    vi.mocked(glob).mockResolvedValue([])

    // Mock en.json doesn't exist
    vi.mocked(fs.existsSync).mockReturnValue(false)

    await expect(checker.check()).rejects.toThrow('Translation file not found')
  })

  it('should return all keys as unused when no keys are used in codebase', async () => {
    const checker = new I18nUnusedKeysChecker('/mock/src', '/mock/messages', {
      whitelistPrefixes: [], // No whitelist
    })

    // Mock glob for namespace map building
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/en.json' ])

    // Mock file system
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('/messages/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
          },
        })
      }
      if (filePath.toString().includes('/src/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
          },
        })
      }
      return ''
    })

    // Mock glob to return no source files (second call)
    vi.mocked(glob).mockResolvedValueOnce([])

    const result = await checker.check()
    expect(result.unusedKeys).toContain('common.save')
    expect(result.unusedKeys).toContain('common.cancel')
    expect(result.statistics.definedKeysCount).toBe(2)
    expect(result.statistics.usedKeysCount).toBe(0)
    expect(result.statistics.unusedKeysCount).toBe(2)
  })

  it('should return empty unusedKeys array when all keys are used', async () => {
    const checker = new I18nUnusedKeysChecker('/mock/src', '/mock/messages', {
      whitelistPrefixes: [],
    })

    // Mock namespace map building
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/en.json' ])

    // Mock locale file with defined keys
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('/messages/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
          },
        })
      }
      if (filePath.toString().includes('/src/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
          },
        })
      }
      // Mock source file using all keys
      return `const T = useTranslations('common')
T('save')
T('cancel')`
    })

    // Mock glob to return a test file (second call)
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/test.ts' ])

    const result = await checker.check()
    expect(result.unusedKeys).toEqual([])
    expect(result.statistics.definedKeysCount).toBe(2)
    expect(result.statistics.usedKeysCount).toBe(2)
    expect(result.statistics.unusedKeysCount).toBe(0)
  })

  it('should detect unused keys correctly', async () => {
    const checker = new I18nUnusedKeysChecker('/mock/src', '/mock/messages', {
      whitelistPrefixes: [],
    })

    // Mock namespace map building
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/en.json' ])

    // Mock locale file with defined keys
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('/messages/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            update: 'Update',
          },
        })
      }
      if (filePath.toString().includes('/src/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            update: 'Update',
          },
        })
      }
      // Mock source file only using save and cancel
      return `const T = useTranslations('common')
T('save')
T('cancel')`
    })

    // Mock glob to return a test file (second call)
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/test.ts' ])

    const result = await checker.check()
    expect(result.unusedKeys).toContain('common.delete')
    expect(result.unusedKeys).toContain('common.update')
    expect(result.unusedKeys.length).toBe(2)
    expect(result.statistics.definedKeysCount).toBe(4)
    expect(result.statistics.usedKeysCount).toBe(2)
    expect(result.statistics.unusedKeysCount).toBe(2)
  })

  it('should respect whitelist prefixes', async () => {
    const checker = new I18nUnusedKeysChecker('/mock/src', '/mock/messages', {
      whitelistPrefixes: [ 'common' ],
    })

    // Mock namespace map building
    vi.mocked(glob).mockResolvedValueOnce([
      '/mock/src/en.json',
      '/mock/src/pages/dashboard/en.json',
    ])

    // Mock locale file with defined keys
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('/messages/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
          },
          pages: {
            dashboard: {
              title: 'Dashboard',
              unused: 'Unused',
            },
          },
        })
      }
      if (filePath.toString().includes('/src/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
          },
        })
      }
      if (filePath.toString().includes('/src/pages/dashboard/en.json')) {
        return JSON.stringify({
          title: 'Dashboard',
          unused: 'Unused',
        })
      }
      return ''
    })

    // Mock glob to return no source files (second call)
    vi.mocked(glob).mockResolvedValueOnce([])

    const result = await checker.check()
    // common.* keys should be whitelisted
    expect(result.unusedKeys).not.toContain('common.save')
    expect(result.unusedKeys).not.toContain('common.cancel')
    // but pages.dashboard.unused should be reported
    expect(result.unusedKeys).toContain('pages.dashboard.unused')
  })

  it('should handle multiple namespaces correctly', async () => {
    const checker = new I18nUnusedKeysChecker('/mock/src', '/mock/messages', {
      whitelistPrefixes: [],
    })

    // Mock namespace map building
    vi.mocked(glob).mockResolvedValueOnce([
      '/mock/src/en.json',
      '/mock/src/pages/dashboard/en.json',
    ])

    // Mock locale file with defined keys
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('/messages/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
          },
          pages: {
            dashboard: {
              title: 'Dashboard',
              description: 'Description',
            },
          },
        })
      }
      if (filePath.toString().includes('/src/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
          },
        })
      }
      if (filePath.toString().includes('/src/pages/dashboard/en.json')) {
        return JSON.stringify({
          title: 'Dashboard',
          description: 'Description',
        })
      }
      // Mock source file only using common.save and pages.dashboard.title
      return `const T1 = useTranslations('common')
const T2 = useTranslations('pages.dashboard')
T1('save')
T2('title')`
    })

    // Mock glob to return a test file (second call)
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/test.ts' ])

    const result = await checker.check()
    expect(result.unusedKeys).toContain('common.cancel')
    expect(result.unusedKeys).toContain('pages.dashboard.description')
    expect(result.unusedKeys.length).toBe(2)
  })

  it('should handle vue-i18n usage patterns', async () => {
    const checker = new I18nUnusedKeysChecker('/mock/src', '/mock/messages', {
      whitelistPrefixes: [],
    })

    // Mock namespace map building
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/en.json' ])

    // Mock locale file with defined keys
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('/messages/en.json')) {
        return JSON.stringify({
          common: {
            welcome: 'Welcome',
            goodbye: 'Goodbye',
            hello: 'Hello',
          },
        })
      }
      if (filePath.toString().includes('/src/en.json')) {
        return JSON.stringify({
          common: {
            welcome: 'Welcome',
            goodbye: 'Goodbye',
            hello: 'Hello',
          },
        })
      }
      // Mock source file using vue-i18n methods
      return `const { t } = useI18n()
t('common.welcome')
$t('common.goodbye')`
    })

    // Mock glob to return a test file (second call)
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/component.vue' ])

    const result = await checker.check()
    expect(result.unusedKeys).toContain('common.hello')
    expect(result.unusedKeys.length).toBe(1)
  })

  it('should handle template literal keys with wildcards', async () => {
    const checker = new I18nUnusedKeysChecker('/mock/src', '/mock/messages', {
      whitelistPrefixes: [],
    })

    // Mock namespace map building
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/en.json' ])

    // Mock locale file with defined keys
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('/messages/en.json')) {
        return JSON.stringify({
          common: {
            'error.404': 'Not Found',
            'error.500': 'Server Error',
            'error.403': 'Forbidden',
          },
        })
      }
      if (filePath.toString().includes('/src/en.json')) {
        return JSON.stringify({
          common: {
            'error.404': 'Not Found',
            'error.500': 'Server Error',
            'error.403': 'Forbidden',
          },
        })
      }
      // Mock source file using dynamic key pattern
      return `const T = useTranslations('common')
const code = '404'
T(\`error.\${code}\`)`
    })

    // Mock glob to return a test file (second call)
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/dynamic.ts' ])

    const result = await checker.check()
    // Should not report any unused keys since dynamic pattern matches all error.*
    expect(result.unusedKeys.length).toBe(0)
  })

  it('should group unused keys by file correctly', async () => {
    const checker = new I18nUnusedKeysChecker('/mock/src', '/mock/messages', {
      whitelistPrefixes: [],
    })

    // Mock namespace map building
    vi.mocked(glob).mockResolvedValueOnce([
      '/mock/src/en.json',
      '/mock/src/pages/dashboard/en.json',
    ])

    // Mock locale file with defined keys (flattened after merge)
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('/messages/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            unused1: 'Unused 1',
          },
          pages: {
            dashboard: {
              title: 'Dashboard',
              unused2: 'Unused 2',
              unused3: 'Unused 3',
            },
          },
        })
      }
      if (filePath.toString().includes('/src/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            unused1: 'Unused 1',
          },
        })
      }
      if (filePath.toString().includes('/src/pages/dashboard/en.json')) {
        return JSON.stringify({
          title: 'Dashboard',
          unused2: 'Unused 2',
          unused3: 'Unused 3',
        })
      }
      // Mock source file
      return `const T = useTranslations('common')
T('save')`
    })

    // Mock glob to return a test file (second call)
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/test.ts' ])

    const result = await checker.check()

    expect(result.fileGroups.size).toBe(2)

    const commonGroup = result.fileGroups.get('/mock/src/en.json')
    expect(commonGroup).toBeDefined()
    expect(commonGroup?.namespace).toBe('')
    expect(commonGroup?.keys.length).toBe(1)
    expect(commonGroup?.keys[0]?.localKeyPath).toBe('common.unused1')

    const dashboardGroup = result.fileGroups.get('/mock/src/pages/dashboard/en.json')
    expect(dashboardGroup).toBeDefined()
    expect(dashboardGroup?.namespace).toBe('pages.dashboard')
    expect(dashboardGroup?.keys.length).toBe(3) // title, unused2, unused3 are all unused
  })

  it('should handle nested namespace keys', async () => {
    const checker = new I18nUnusedKeysChecker('/mock/src', '/mock/messages', {
      whitelistPrefixes: [],
    })

    // Mock namespace map building
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/pages/dashboard/en.json' ])

    // Mock locale file with defined keys
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('/messages/en.json')) {
        return JSON.stringify({
          pages: {
            dashboard: {
              title: 'Dashboard',
              description: 'Description',
              subtitle: 'Subtitle',
            },
          },
        })
      }
      if (filePath.toString().includes('/src/pages/dashboard/en.json')) {
        return JSON.stringify({
          title: 'Dashboard',
          description: 'Description',
          subtitle: 'Subtitle',
        })
      }
      // Mock source file only using title
      return `const T = useTranslations('pages.dashboard')
T('title')`
    })

    // Mock glob to return a test file (second call)
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/pages/dashboard/index.vue' ])

    const result = await checker.check()
    expect(result.unusedKeys).toContain('pages.dashboard.description')
    expect(result.unusedKeys).toContain('pages.dashboard.subtitle')
    expect(result.unusedKeys.length).toBe(2)
  })

  it('should fix unused keys by removing them from source files', async () => {
    const checker = new I18nUnusedKeysChecker('/mock/src', '/mock/messages', {
      whitelistPrefixes: [],
    })

    // Mock namespace map building
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/en.json' ])

    // Mock locale file
    vi.mocked(fs.existsSync).mockReturnValue(true)
    const sourceFileContent = JSON.stringify({
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
      },
    })

    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('/messages/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
          },
        })
      }
      if (filePath.toString().includes('/src/en.json')) {
        return sourceFileContent
      }
      // Mock source file only using save
      return `const T = useTranslations('common')
T('save')`
    })

    // Mock glob to return a test file (second call)
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/test.ts' ])

    const result = await checker.check()
    expect(result.unusedKeys.length).toBe(2)

    // Mock writeFileSync
    const writeFileSyncMock = vi.mocked(fs.writeFileSync)

    const fixedCount = await checker.fix(result.fileGroups)

    expect(fixedCount).toBe(2)
    expect(writeFileSyncMock).toHaveBeenCalled()

    // Verify the written content
    const writtenContent = writeFileSyncMock.mock.calls[0]?.[1]
    expect(writtenContent).toBeDefined()
    const parsedContent = JSON.parse(writtenContent as string)
    expect(parsedContent).toEqual({ common: { save: 'Save' }})
  })

  it('should handle keypath attribute in Vue templates', async () => {
    const checker = new I18nUnusedKeysChecker('/mock/src', '/mock/messages', {
      whitelistPrefixes: [],
    })

    // Mock namespace map building
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/en.json' ])

    // Mock locale file
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('/messages/en.json')) {
        return JSON.stringify({
          common: {
            welcome: 'Welcome',
            greeting: 'Hello',
            goodbye: 'Goodbye',
          },
        })
      }
      if (filePath.toString().includes('/src/en.json')) {
        return JSON.stringify({
          common: {
            welcome: 'Welcome',
            greeting: 'Hello',
            goodbye: 'Goodbye',
          },
        })
      }
      // Mock template using only welcome and greeting
      return `<template>
  <i18n-t keypath="common.welcome" />
  <i18n-t :keypath="'common.greeting'" />
</template>`
    })

    // Mock glob to return a test file (second call)
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/template.vue' ])

    const result = await checker.check()
    expect(result.unusedKeys).toContain('common.goodbye')
    expect(result.unusedKeys.length).toBe(1)
  })

  it('should handle mixed translation factories and vue-i18n methods', async () => {
    const checker = new I18nUnusedKeysChecker('/mock/src', '/mock/messages', {
      whitelistPrefixes: [],
    })

    // Mock namespace map building
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/en.json' ])

    // Mock locale file
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('/messages/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            update: 'Update',
          },
        })
      }
      if (filePath.toString().includes('/src/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            update: 'Update',
          },
        })
      }
      // Mock source file using mixed patterns
      return `const T = useTranslations('common')
const { t } = useI18n()

T('save')
t('common.cancel')
$t('common.delete')`
    })

    // Mock glob to return a test file (second call)
    vi.mocked(glob).mockResolvedValueOnce([ '/mock/src/mixed.ts' ])

    const result = await checker.check()
    expect(result.unusedKeys).toContain('common.update')
    expect(result.unusedKeys.length).toBe(1)
  })

  it('should support multiple source directories', async () => {
    const checker = new I18nUnusedKeysChecker([ '/mock/app', '/mock/server' ], '/mock/messages', {
      whitelistPrefixes: [],
      srcDirNamespaces: { '/mock/server': 'server' },
    })

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(filePath => {
      if (filePath.toString().includes('/messages/en.json')) {
        return JSON.stringify({
          common: { save: 'Save', cancel: 'Cancel' },
          server: { error: 'Error', warning: 'Warning' },
        })
      }
      if (filePath.toString().includes('/app/en.json')) {
        return JSON.stringify({
          common: {
            save: 'Save',
            cancel: 'Cancel',
          },
        })
      }
      if (filePath.toString().includes('/server/en.json')) {
        return JSON.stringify({
          error: 'Error',
          warning: 'Warning',
        })
      }
      if (filePath.toString().includes('/app/page.ts')) {
        return 'const T = useTranslations("common")\nT("save") // only use save'
      }
      if (filePath.toString().includes('/server/api.ts')) {
        return 'const T = useTranslations("server")\nT("error") // only use error'
      }
      return ''
    })

    // Mock namespace map building (glob calls for each directory)
    // Then source file scanning (glob calls for each directory)
    vi.mocked(glob)
      .mockResolvedValueOnce([ '/mock/app/en.json' ]) // namespace map: app directory
      .mockResolvedValueOnce([ '/mock/server/en.json' ]) // namespace map: server directory
      .mockResolvedValueOnce([ '/mock/app/page.ts' ]) // source scan: app files
      .mockResolvedValueOnce([ '/mock/server/api.ts' ]) // source scan: server files

    const result = await checker.check()
    expect(result.unusedKeys).toContain('common.cancel') // unused from app
    expect(result.unusedKeys).toContain('server.warning') // unused from server
    expect(result.unusedKeys.length).toBe(2)
    expect(result.statistics.definedKeysCount).toBe(4)
    expect(result.statistics.usedKeysCount).toBe(2)
  })
})
