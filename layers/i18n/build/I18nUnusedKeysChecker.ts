/**
 * I18n Unused Keys Checker
 *
 * A utility class for detecting unused translation keys in translation files.
 *
 * === CORE LOGIC ===
 *
 * 1. Load All Defined Keys:
 *    - Load translation keys from the compiled messages file
 *    - Extract and flatten all keys
 *
 * 2. Scan Source Code for Used Keys:
 *    - Reuse the I18nUndefinedKeysChecker to find all translation key usages
 *    - Extract the set of keys actually used in the codebase
 *
 * 3. Set Operation - Find Unused Keys:
 *    - unusedKeys = definedKeys - usedKeys - whitelistKeys
 *
 * 4. Namespace Mapping:
 *    - Pre-scan all locale files to build namespace → filepath mapping
 *    - Match unused keys to their source files efficiently
 *
 * 5. Optional Cleanup:
 *    - Remove unused keys from source files
 *    - Clean up empty parent objects
 */

import fs from 'node:fs'
import path from 'node:path'
import { glob } from 'glob'
import {
  DEFAULT_TRANSLATION_FACTORIES,
  I18N_LIBRARIES,
  extractMessageKeys,
  findI18nUsage,
  loadMessages,
  pathToNamespace,
  type I18nScannerConfig,
  type KeyUsageEntry,
} from './utils'

// ===== TYPE DEFINITIONS =====

/**
 * Configuration options for I18nUnusedKeysChecker
 */
export interface I18nUnusedKeysCheckerOptions {
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
   * Whitelist prefixes that should be ignored (not considered unused)
   * @default ['common', 'lib.server.error', 'lib.common.validation']
   */
  whitelistPrefixes?: string[]

  /**
   * Reference locale key to check against (e.g., 'en', 'zh-CN')
   * @default 'en'
   */
  referenceLocale?: string

  /**
   * Namespace mapping for source directories
   * Keys must match the full srcDir paths
   * Example: { '/project/server': 'server' }
   * - '/project/server' directory files will be under 'server' namespace
   * @default {}
   */
  srcDirNamespaces?: Record<string, string>
}

/**
 * Best matching namespace result for a given key
 */
interface NamespaceMatch {
  namespace: string
  filePath: string
  localKeyPath: string
}

/**
 * Unused keys grouped by source file
 */
export interface FileGroup {
  namespace: string
  keys: Array<{
    fullKey: string
    localKeyPath: string
  }>
}

// ===== MAIN CLASS =====

/**
 * I18n Unused Keys Checker
 *
 * Detects unused translation keys by comparing defined keys against actual usage
 * in the codebase, with optional automatic cleanup.
 *
 * @example
 * ```ts
 * // Basic usage
 * const checker = new I18nUnusedKeysChecker(
 *   '/path/to/app',
 *   '/path/to/i18n/messages'
 * )
 *
 * // With custom options
 * const checker = new I18nUnusedKeysChecker(
 *   '/path/to/app',
 *   '/path/to/i18n/messages',
 *   {
 *     whitelistPrefixes: ['common', 'lib.server'],
 *     translationFactories: ['useTranslations'],
 *     i18nLibrary: 'vue-i18n'
 *   }
 * )
 *
 * const { unusedKeys, fileGroups } = await checker.check()
 * checker.printUnusedKeys(fileGroups)
 *
 * // Optionally fix by removing unused keys
 * const fixedCount = await checker.fix(fileGroups)
 * ```
 */
export class I18nUnusedKeysChecker {
  private readonly srcDirs: string[]
  private readonly localesDir: string
  private readonly whitelistPrefixes: string[]
  private readonly scannerConfig: I18nScannerConfig
  private readonly referenceLocale: string
  private readonly srcDirNamespaces: Record<string, string>

  constructor (
    srcDir: string | string[],
    localesDir: string,
    options: I18nUnusedKeysCheckerOptions = {},
  ) {
    this.srcDirs = Array.isArray(srcDir) ? srcDir : [ srcDir ]
    this.localesDir = localesDir
    this.whitelistPrefixes = options.whitelistPrefixes ?? []
    this.referenceLocale = options.referenceLocale ?? 'en'
    this.srcDirNamespaces = options.srcDirNamespaces ?? {}

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
   * Build namespace → filepath mapping by scanning all locale files
   *
   * @returns Map of namespace to file path
   */
  private async buildNamespaceMap (): Promise<Map<string, string>> {
    console.debug('📁 Scanning all locale files to build namespace mapping...')

    const namespaceMap = new Map<string, string>()

    // Scan all source directories
    for (const srcDir of this.srcDirs) {
      const prefix = this.srcDirNamespaces[srcDir]
      const pattern = path.join(srcDir, `**/${this.referenceLocale}.json`).replace(/\\/g, '/')
      const localeFiles = await glob(pattern)

      for (const filePath of localeFiles) {
        const namespace = pathToNamespace(filePath, srcDir, prefix)
        namespaceMap.set(namespace, filePath)
      }
    }

    console.debug(`   Found ${namespaceMap.size} translation files`)

    return namespaceMap
  }

  /**
   * Find the best matching namespace for a given key
   *
   * @param key - Full translation key (e.g., 'app.pages.dashboard.title')
   * @param namespaceMap - Map of namespace to file path
   * @returns Best matching namespace information or null if no match found
   *
   * @example
   * ```ts
   * const namespaceMap = new Map([
   *   ['app.pages.dashboard', '/project/app/pages/dashboard/en.json']
   * ])
   * findBestMatchingNamespace('app.pages.dashboard.title', namespaceMap)
   * // Returns: {
   * //   namespace: 'app.pages.dashboard',
   * //   filePath: '/project/app/pages/dashboard/en.json',
   * //   localKeyPath: 'title'
   * // }
   * ```
   */
  private findBestMatchingNamespace (
    key: string,
    namespaceMap: Map<string, string>,
  ): NamespaceMatch | null {
    const keyParts = key.split('.')

    // Try different namespace depths, from longest to shortest
    // i >= 0 allows matching empty namespace (root directory files)
    for (let i = keyParts.length - 1; i >= 0; i--) {
      const candidateNamespace = keyParts.slice(0, i).join('.')

      if (namespaceMap.has(candidateNamespace)) {
        const filePath = namespaceMap.get(candidateNamespace)!
        const localKeyPath = keyParts.slice(i).join('.')

        return {
          namespace: candidateNamespace,
          filePath,
          localKeyPath,
        }
      }
    }

    // If no match found, this indicates a logic error
    return null
  }

  /**
   * Check if a defined key (complete, no wildcards) matches any usage key in a set
   *
   * @param definedKey - Defined key from translation files (complete key without wildcards)
   * @param usageKeys - Set of usage keys from code (may contain wildcards like 'common.error.*')
   * @returns True if the defined key matches any usage key pattern
   *
   * @example
   * ```ts
   * const usageKeys = new Set(['common.error.*', 'common.actions.save'])
   *
   * // Direct match
   * isDefinedKeyMatchedByUsage('common.actions.save', usageKeys) // true
   *
   * // Wildcard matching: usageKeys contains *
   * isDefinedKeyMatchedByUsage('common.error.404', usageKeys) // true (matches 'common.error.*')
   * isDefinedKeyMatchedByUsage('common.error.not.found', usageKeys) // false ('common.error.*' only matches 1 segment)
   * ```
   */
  private isDefinedKeyMatchedByUsage (definedKey: string, usageKeys: Set<string>): boolean {
    // Direct match - fastest check
    if (usageKeys.has(definedKey)) {
      return true
    }

    // Check if any usage key (which may contain wildcards) matches this defined key
    for (const usageKey of usageKeys) {
      // If the usage key contains a wildcard, check if it matches the defined key
      if (usageKey.includes('*')) {
        // Convert wildcard pattern to regex
        // Each * should only match a single segment (not including dots)
        const regexPattern = usageKey
          .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except *
          .replace(/\*/g, '[^.]+') // Replace * with [^.]+ to match one segment only

        const regex = new RegExp(`^${regexPattern}$`)

        if (regex.test(definedKey)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Check if a key should be ignored based on whitelist prefixes
   *
   * @param key - Translation key to check
   * @returns True if the key should be ignored
   */
  private isWhitelistedKey (key: string): boolean {
    return this.whitelistPrefixes.some(
      prefix => key.startsWith(prefix + '.') || key === prefix,
    )
  }

  /**
   * Group unused keys by their source files
   *
   * @param unusedKeys - Array of unused translation keys
   * @param namespaceMap - Map of namespace to file path
   * @returns Map of file path to file group information
   */
  private groupUnusedKeysByFile (
    unusedKeys: string[],
    namespaceMap: Map<string, string>,
  ): Map<string, FileGroup> {
    const fileGroups = new Map<string, FileGroup>()
    const unmatchedKeys: string[] = []

    for (const key of unusedKeys) {
      const match = this.findBestMatchingNamespace(key, namespaceMap)

      if (!match) {
        unmatchedKeys.push(key)
        continue
      }

      const { filePath, namespace, localKeyPath } = match

      if (!fileGroups.has(filePath)) {
        fileGroups.set(filePath, {
          namespace,
          keys: [],
        })
      }

      fileGroups.get(filePath)!.keys.push({
        fullKey: key,
        localKeyPath,
      })
    }

    // Validate: All keys should be matched
    if (unmatchedKeys.length > 0) {
      console.error(
        `⚠️  Logic Error: ${unmatchedKeys.length} keys could not be matched to source files:`,
      )
      unmatchedKeys.forEach(key => console.error(`   ${key}`))
      console.error('   This indicates a problem with the namespace mapping logic.')
    }

    return fileGroups
  }

  /**
   * Remove unused keys from a JSON object recursively
   *
   * @param obj - JSON object to modify
   * @param keysToRemove - Array of key paths to remove (in dot notation)
   * @returns True if any keys were removed
   */
  private removeKeysFromObject (obj: Record<string, any>, keysToRemove: string[]): boolean {
    let modified = false

    for (const keyPath of keysToRemove) {
      const keys = keyPath.split('.')
      let current: any = obj
      let parent: any = null
      let lastKey: string | null = null

      // Navigate to the parent of the key to remove
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i]
        if (!key) continue
        if (current[key] && typeof current[key] === 'object') {
          parent = current
          current = current[key]
          lastKey = key
        } else {
          current = null
          break
        }
      }

      // Remove the key if found
      const finalKey = keys[keys.length - 1]
      if (current && finalKey && Object.prototype.hasOwnProperty.call(current, finalKey)) {
        // Use Reflect.deleteProperty to avoid ESLint error for dynamic delete
        Reflect.deleteProperty(current, finalKey)
        modified = true

        // If the parent object is now empty, remove it too
        if (Object.keys(current).length === 0 && parent && lastKey) {
          Reflect.deleteProperty(parent, lastKey)
        }
      }
    }

    return modified
  }

  /**
   * Process usage map and extract used keys with wildcard conversion for dynamic keys
   *
   * @param usage - Map of full keys to usage entries
   * @returns Array of used keys (with ${...} converted to * for dynamic keys)
   */
  private processUsedKeys (usage: Map<string, KeyUsageEntry[]>): string[] {
    const usedKeys: string[] = []

    for (const [ fullKey, locations ] of usage.entries()) {
      // Check if any location is dynamic and contains ${...}
      const hasDynamicUsage = locations.some(loc => loc.isDynamic && fullKey.includes('${'))

      if (hasDynamicUsage) {
        // Convert ${...} to * for wildcard matching
        const wildcardKey = fullKey.replace(/\$\{[^}]+\}/g, '*')

        // Skip keys that start with wildcard (prefix wildcard)
        // These are too ambiguous and cannot be validated
        // Examples to skip: '*.*', '*.save', '*.label.confirm'
        // Examples to keep: 'common.statuses.*', 'app.error.*'
        if (wildcardKey.startsWith('*')) {
          continue
        }

        usedKeys.push(wildcardKey)
      } else {
        // Use the key as-is for static usages
        usedKeys.push(fullKey)
      }
    }

    return usedKeys
  }

  /**
   * Check for unused keys by comparing defined keys against usage
   *
   * @returns Object containing unused keys, file groups, and statistics
   * @throws Error if reference locale file is not found in localesDir
   */
  async check (): Promise<{
    unusedKeys: string[]
    fileGroups: Map<string, FileGroup>
    statistics: {
      definedKeysCount: number
      usedKeysCount: number
      unusedKeysCount: number
    }
  }> {
    // Step 1: Build namespace mapping table by pre-scanning all locale files
    const namespaceMap = await this.buildNamespaceMap()

    // Step 2: Load all defined keys from reference locale file
    const localeFilePath = path.join(this.localesDir, `${this.referenceLocale}.json`)
    if (!fs.existsSync(localeFilePath)) {
      throw new Error(`Translation file not found: ${localeFilePath}`)
    }

    const messages = loadMessages(localeFilePath)
    const definedKeys = extractMessageKeys(messages)
    console.debug(`📖 Loaded ${definedKeys.length} defined translation keys from ${this.referenceLocale}.json`)

    // Step 3: Scan source files from all source directories to find used keys
    const usage = new Map<string, KeyUsageEntry[]>()
    for (const srcDir of this.srcDirs) {
      const dirUsage = await findI18nUsage(srcDir, this.scannerConfig)
      // Merge usage from all directories
      for (const [ fullKey, entries ] of dirUsage.entries()) {
        const existingEntries = usage.get(fullKey) || []
        usage.set(fullKey, [ ...existingEntries, ...entries ])
      }
    }

    const usedKeys = this.processUsedKeys(usage)
    console.debug(`🔎 Found ${usedKeys.length} unique translation keys used in source files`)

    // Step 4: Find unused keys using set operations
    const definedSet = new Set(definedKeys)
    const usedSet = new Set(usedKeys)

    const unusedKeys: string[] = []
    for (const key of definedSet) {
      if (!this.isWhitelistedKey(key)) {
        // Check if this defined key is used (including wildcard matching)
        const isUsed = this.isDefinedKeyMatchedByUsage(key, usedSet)

        if (!isUsed) {
          unusedKeys.push(key)
        }
      }
    }

    console.debug(
      `🎯 After whitelist filtering: ${unusedKeys.length} unused keys remaining\n`,
    )

    // Step 5: Group unused keys by source files using pre-built mapping
    const fileGroups = this.groupUnusedKeysByFile(unusedKeys, namespaceMap)

    return {
      unusedKeys,
      fileGroups,
      statistics: {
        definedKeysCount: definedKeys.length,
        usedKeysCount: usedKeys.length,
        unusedKeysCount: unusedKeys.length,
      },
    }
  }

  /**
   * Format and print unused keys grouped by file
   *
   * @param fileGroups - Map of file path to file group information
   */
  printUnusedKeys (fileGroups: Map<string, FileGroup>): void {
    const totalUnused = Array.from(fileGroups.values()).reduce(
      (sum, group) => sum + group.keys.length,
      0,
    )

    console.error(`❌ Found ${totalUnused} unused i18n keys:\n`)

    for (const [ filePath, { namespace, keys }] of fileGroups) {
      console.error(`📄 ${filePath}${namespace ? ` (namespace: ${namespace})` : ''}:`)

      keys.forEach(({ fullKey, localKeyPath }) => {
        console.error(`   "${localKeyPath}" → "${fullKey}"`)
      })
      console.error()
    }

    console.error('💡 Use the fix() method to automatically remove unused keys from source files')
  }

  /**
   * Fix unused keys by removing them from source files
   *
   * @param fileGroups - Map of file path to file group information
   * @returns Number of keys removed
   */
  async fix (fileGroups: Map<string, FileGroup>): Promise<number> {
    let totalFixed = 0

    console.debug('\n🔧 Removing unused keys from source files...\n')

    for (const [ filePath, { keys }] of fileGroups) {
      if (!fs.existsSync(filePath)) {
        console.error(`⚠️  Source file not found: ${filePath}`)
        continue
      }

      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const data = JSON.parse(content)

        // Extract the local key paths for removal
        const localKeysToRemove = keys.map(item => item.localKeyPath)

        const wasModified = this.removeKeysFromObject(data, localKeysToRemove)

        if (wasModified) {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n')
          console.debug(`📝 Fixed ${filePath}`)
          console.debug(
            `   Removed ${localKeysToRemove.length} unused keys: ${localKeysToRemove.join(', ')}`,
          )
          totalFixed += localKeysToRemove.length
        }
      } catch (error) {
        console.error(`❌ Failed to process ${filePath}:`, error instanceof Error ? error.message : String(error))
      }
    }

    console.debug(`\n✅ Total unused keys removed: ${totalFixed}`)
    return totalFixed
  }
}
