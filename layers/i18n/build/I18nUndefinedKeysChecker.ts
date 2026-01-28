/**
 * I18n Undefined Keys Checker
 *
 * A utility class for detecting undefined translation keys in source code.
 *
 * === CORE LOGIC ===
 *
 * 1. Extract Translation Function Factory Declarations:
 *    - Scan for factory functions that create translation functions
 *    - Track namespace parameter if provided
 *
 * 2. Find Translation Key Usage:
 *    - Match all translation methods: T('key'), t('key'), $t('key'), i18n.t('key')
 *    - Match all key attributes: keypath="key", :keypath="'key'"
 *    - Extract keys and resolve namespace if applicable
 *
 * 3. Key Resolution:
 *    - If method is in namespaceAwareMethods and has namespace: prepend namespace
 *    - Otherwise: use key as-is
 *
 * 4. Validate Against Available Keys:
 *    - Load translation messages from JSON
 *    - Compare usage keys with available keys
 *    - Report undefined keys
 */

import fs from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_TRANSLATION_FACTORIES,
  I18N_LIBRARIES,
  extractMessageKeys,
  findI18nUsage,
  loadMessages,
  type I18nScannerConfig,
  type KeyUsageEntry,
} from './utils'

// ===== TYPE DEFINITIONS =====

/**
 * Configuration options for I18nUndefinedKeysChecker
 */
export interface I18nUndefinedKeysCheckerOptions {
  /**
   * Custom translation function factory methods that support namespace
   * These functions return translation functions with optional namespace parameter
   * @default ['useTranslations', 'getTranslations']
   * @example const T = useTranslations('common'); T('save') → 'common.save'
   */
  translationFactories?: string[]

  /**
   * i18n library to use (currently only 'vue-i18n' is supported)
   * @default 'vue-i18n'
   */
  i18nLibrary?: keyof typeof I18N_LIBRARIES

  /**
   * Reference locale key to check against (e.g., 'en', 'zh-CN')
   * @default 'en'
   */
  referenceLocale?: string
}

// ===== MAIN CLASS =====

/**
 * I18n Undefined Keys Checker
 *
 * Detects undefined translation keys by analyzing source code and comparing
 * against available translation messages.
 *
 * @example
 * ```ts
 * // Basic usage with default settings (vue-i18n)
 * const checker = new I18nUndefinedKeysChecker(
 *   '/path/to/app',
 *   '/path/to/i18n/messages'
 * )
 *
 * // With custom translation factories
 * const checker = new I18nUndefinedKeysChecker(
 *   '/path/to/app',
 *   '/path/to/i18n/messages',
 *   {
 *     translationFactories: ['useTranslations', 'getTranslations'],
 *     i18nLibrary: 'vue-i18n'
 *   }
 * )
 *
 * const { undefinedKeys } = await checker.check()
 * checker.printUndefinedKeys(undefinedKeys)
 * ```
 */
export class I18nUndefinedKeysChecker {
  private readonly srcDirs: string[]
  private readonly localesDir: string
  private readonly scannerConfig: I18nScannerConfig
  private readonly referenceLocale: string

  constructor (
    srcDir: string | string[],
    localesDir: string,
    options: I18nUndefinedKeysCheckerOptions = {},
  ) {
    this.srcDirs = Array.isArray(srcDir) ? srcDir : [ srcDir ]
    this.localesDir = localesDir
    this.referenceLocale = options.referenceLocale ?? 'en'

    // Set custom translation factories
    const translationFactories = options.translationFactories ?? DEFAULT_TRANSLATION_FACTORIES

    // Load i18n library preset
    const i18nLibrary = options.i18nLibrary ?? 'vue-i18n'
    const libraryConfig = I18N_LIBRARIES[i18nLibrary]

    // Build scanner configuration
    this.scannerConfig = {
      translationFactories,
      i18nComposables: libraryConfig.composables,
      i18nMethods: libraryConfig.methods,
      i18nGlobalMethods: libraryConfig.globalMethods,
      keyAttributes: libraryConfig.keyAttributes,
      pageMetaFields: libraryConfig.pageMetaFields,
    }
  }

  /**
   * Check if a usage key (may contain wildcards) matches any defined key in a set
   *
   * @param usageKey - Usage key from code (may contain wildcards like '*.name')
   * @param definedKeys - Set of defined keys from translation files (complete keys without wildcards)
   * @returns True if the usage key matches any defined key
   *
   * @example
   * ```ts
   * const definedKeys = new Set(['pages.app.dashboard.name', 'common.actions.save'])
   *
   * // Direct match
   * isUsageKeyMatchedByDefinition('common.actions.save', definedKeys) // true
   *
   * // Wildcard matching: usageKey contains *
   * isUsageKeyMatchedByDefinition('*.name', definedKeys) // true (matches 'pages.app.dashboard.name')
   * isUsageKeyMatchedByDefinition('pages.*.name', definedKeys) // true (matches 'pages.app.dashboard.name')
   * isUsageKeyMatchedByDefinition('common.*', definedKeys) // false ('common.actions.save' has 2 segments after 'common')
   * ```
   */
  private isUsageKeyMatchedByDefinition (usageKey: string, definedKeys: Set<string>): boolean {
    // Direct match - fastest check
    if (definedKeys.has(usageKey)) {
      return true
    }

    // Wildcard matching: usageKey contains * wildcard
    if (usageKey.includes('*')) {
      // Convert wildcard pattern to regex
      // Each * should only match a single segment (not including dots)
      const regexPattern = usageKey
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except *
        .replace(/\*/g, '[^.]+') // Replace * with [^.]+ to match one segment only

      const regex = new RegExp(`^${regexPattern}$`)

      // Test against all defined keys
      for (const definedKey of definedKeys) {
        if (regex.test(definedKey)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Check for undefined keys
   */
  private checkUndefinedKeys (
    usage: Map<string, KeyUsageEntry[]>,
    definedKeys: Set<string>,
  ): KeyUsageEntry[] {
    const undefinedKeys: KeyUsageEntry[] = []

    for (const [ fullKey, locations ] of usage.entries()) {
      // Check each location individually since they might have different isDynamic values
      for (const location of locations) {
        // Convert ${...} to * for wildcard matching only if isDynamic is true
        // Static string literals like '${namespace}.name' (isDynamic=false) should NOT be converted
        const keyToCheck = location.isDynamic
          ? fullKey.replace(/\$\{[^}]+\}/g, '*')
          : fullKey

        // Skip keys that start with wildcard (prefix wildcard) or are just a single wildcard
        // These are too ambiguous and cannot be validated
        // Examples to skip: '*', '*.*', '*.save', '*.label.confirm'
        // Examples to keep: 'common.statuses.*', 'app.error.*', 'server.errors.*'
        if (keyToCheck === '*' || keyToCheck.startsWith('*')) {
          continue
        }

        if (!this.isUsageKeyMatchedByDefinition(keyToCheck, definedKeys)) {
          undefinedKeys.push(location)
        }
      }
    }

    return undefinedKeys
  }

  /**
   * Run the check and return undefined keys with statistics
   *
   * @returns Object containing undefined keys and statistics
   * @throws Error if reference locale file is not found in localesDir
   */
  async check (): Promise<{
    undefinedKeys: KeyUsageEntry[]
    statistics: {
      definedKeysCount: number
      usageCount: number
    }
  }> {
    // Load messages from reference locale file
    const localeFilePath = path.join(this.localesDir, `${this.referenceLocale}.json`)
    if (!fs.existsSync(localeFilePath)) {
      throw new Error(`Translation file not found: ${localeFilePath}`)
    }

    const messages = loadMessages(localeFilePath)
    const definedKeys = new Set(extractMessageKeys(messages))

    // Find all i18n usage in source files from all source directories
    const usage = new Map<string, KeyUsageEntry[]>()
    for (const srcDir of this.srcDirs) {
      const dirUsage = await findI18nUsage(srcDir, this.scannerConfig)
      // Merge usage from all directories
      for (const [ fullKey, entries ] of dirUsage.entries()) {
        const existingEntries = usage.get(fullKey) || []
        usage.set(fullKey, [ ...existingEntries, ...entries ])
      }
    }

    // Check for undefined keys
    const undefinedKeys = this.checkUndefinedKeys(usage, definedKeys)

    return {
      undefinedKeys,
      statistics: {
        definedKeysCount: definedKeys.size,
        usageCount: usage.size,
      },
    }
  }

  /**
   * Format and print undefined keys grouped by file
   *
   * @param undefinedKeys - Array of undefined key usage entries to print
   */
  printUndefinedKeys (undefinedKeys: KeyUsageEntry[]): void {
    console.error('❌ Found undefined i18n keys:\n')
    console.error(`Total: ${undefinedKeys.length} undefined keys\n`)

    // Group by file for better readability
    const byFile = new Map<string, KeyUsageEntry[]>()
    undefinedKeys.forEach(item => {
      if (!byFile.has(item.file)) {
        byFile.set(item.file, [])
      }
      byFile.get(item.file)!.push(item)
    })

    // Sort files by path
    const sortedFiles = Array.from(byFile.keys()).sort()

    for (const file of sortedFiles) {
      const items = byFile.get(file)!
      console.error(`📄 ${file}:`)

      // Sort items by line number
      items.sort((a, b) => a.line - b.line)

      items.forEach(({ key, fullKey, line, column, namespace, functionName, quoteType }) => {
        const namespaceInfo = namespace ? `[namespace: ${namespace}]` : '[no namespace]'

        // Check if this is an attribute
        const isAttribute = this.scannerConfig.keyAttributes.some(
          attr => functionName === attr || functionName === `:${attr}`,
        )

        // Check if this is a definePageMeta field
        const isPageMetaField = functionName.startsWith('definePageMeta.')
          && this.scannerConfig.pageMetaFields.includes(functionName.replace('definePageMeta.', ''))

        let usage: string
        if (isPageMetaField) {
          // For definePageMeta fields: definePageMeta.title='xxx'
          const quote = quoteType || '\''
          usage = `${functionName}=${quote}${key}${quote}`
        } else if (isAttribute) {
          // For static attributes: keypath="xxx"
          // For dynamic attributes: :keypath="'xxx'" or :keypath="`${ns}.key`"
          if (functionName.startsWith(':')) {
            // Dynamic attribute: show inner quotes
            const innerQuote = quoteType || ''
            const innerValue = `${innerQuote}${key}${innerQuote}`
            usage = `${functionName}="${innerValue}"`
          } else {
            // Static attribute: no inner quotes needed
            usage = `${functionName}="${key}"`
          }
        } else {
          // For methods: t('xxx') or T(`xxx`)
          const quote = quoteType
          const displayKey = `${quote}${key}${quote}`
          usage = `${functionName}(${displayKey})`
        }

        console.error(`   Line ${line}:${column} - ${namespaceInfo} ${usage} → "${fullKey}"`)
      })
      console.error()
    }
  }
}
