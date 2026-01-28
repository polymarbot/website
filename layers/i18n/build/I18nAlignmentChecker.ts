/**
 * I18n Alignment Checker
 *
 * A utility class for detecting and fixing alignment issues between language files.
 *
 * === CORE LOGIC ===
 *
 * 1. Load Reference Keys:
 *    - Load reference locale file as the baseline translation file
 *    - Extract all keys from the reference file
 *
 * 2. Alignment Detection:
 *    - Compare keys between reference locale and other language files
 *    - Find missing keys (in reference locale but not in target language)
 *    - Find extra keys (in target language but not in reference locale)
 *
 * 3. Auto-correction with fix():
 *    - Remove extra keys from target language files
 *    - Add missing keys with "TODO:" placeholders
 *    - Sort all keys alphabetically for consistency
 *    - Update TODO translations with current reference text
 */

import fs from 'node:fs'
import path from 'node:path'
import { extractMessageKeys, loadMessages } from './utils'

// ===== TYPE DEFINITIONS =====

/**
 * Alignment check result for a language file
 */
export interface AlignmentResult {
  /** Missing keys (in reference locale but not in this file) */
  missing: string[]
  /** Extra keys (in this file but not in reference locale) */
  extra: string[]
  /** Total keys in this file */
  total: number
  /** Whether the file is aligned with reference locale */
  aligned: boolean
}

/**
 * Language file check result
 */
export interface LanguageFileResult {
  /** Language file name (e.g., 'zh-CN.json') */
  file: string
  /** File path */
  path: string
  /** Alignment result */
  alignment: AlignmentResult
  /** Language messages object */
  messages: Record<string, any>
}

// ===== PRIVATE UTILITY FUNCTIONS =====

/**
 * Sort object keys alphabetically (deep sort)
 *
 * @param obj - Object to sort
 * @returns New object with sorted keys
 */
function sortObjectKeys (obj: any): any {
  if (Array.isArray(obj)) {
    return obj
  }

  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  const result: Record<string, any> = {}
  const sortedKeys = Object.keys(obj).sort()

  for (const key of sortedKeys) {
    result[key] = sortObjectKeys(obj[key])
  }

  return result
}

/**
 * Get value at specific path in nested object
 *
 * @param obj - Object to traverse
 * @param keyPath - Dot-separated key path
 * @returns Value at the path or undefined if not found
 */
function getValueAtPath (obj: Record<string, any>, keyPath: string): any {
  const parts = keyPath.split('.')
  let current: any = obj

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Remove key at specific path in nested object
 *
 * @param obj - Object to modify
 * @param keyPath - Dot-separated key path
 * @returns True if key was removed
 */
function removeKeyAtPath (obj: Record<string, any>, keyPath: string): boolean {
  const parts = keyPath.split('.')
  let current: any = obj

  // Navigate to parent object
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!
    if (current && typeof current === 'object' && part in current) {
      current = current[part]
    } else {
      return false // Path doesn't exist
    }
  }

  // Remove the final key
  const finalKey = parts[parts.length - 1]!
  if (current && typeof current === 'object' && finalKey in current) {
    Reflect.deleteProperty(current, finalKey)
    return true
  }

  return false
}

/**
 * Clean up empty parent objects after key removal
 *
 * @param obj - Object to clean up
 * @param keyPath - Dot-separated key path
 */
function cleanupEmptyObjects (obj: Record<string, any>, keyPath: string): void {
  const parts = keyPath.split('.')

  // Work backwards through the path to clean up empty objects
  for (let i = parts.length - 1; i > 0; i--) {
    const parentPath = parts.slice(0, i).join('.')
    const parentObj = getValueAtPath(obj, parentPath)

    if (parentObj && typeof parentObj === 'object' && Object.keys(parentObj).length === 0) {
      removeKeyAtPath(obj, parentPath)
    } else {
      break // Stop if parent is not empty
    }
  }
}

/**
 * Rebuild language file structure with alphabetical key sorting
 *
 * @param enMessages - Reference English messages
 * @param langMessages - Language messages to rebuild
 * @returns Rebuilt language messages with sorted keys and missing translations
 */
function rebuildWithOrder (
  enMessages: Record<string, any>,
  langMessages: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = {}

  function processObject (
    enObj: Record<string, any>,
    langObj: Record<string, any> | undefined,
    targetObj: Record<string, any>,
  ): void {
    // Sort keys alphabetically
    const sortedKeys = Object.keys(enObj).sort()

    for (const key of sortedKeys) {
      const enValue = enObj[key]

      if (Array.isArray(enValue)) {
        // For arrays, copy from langObj if exists, otherwise create TODO
        if (langObj && Array.isArray(langObj[key])) {
          targetObj[key] = [ ...langObj[key] ]
        } else {
          targetObj[key] = `TODO: \`${JSON.stringify(enValue)}\``
        }
      } else if (typeof enValue === 'object' && enValue !== null) {
        // For nested objects, recurse
        targetObj[key] = {}
        const langSubObj = langObj && typeof langObj[key] === 'object' ? langObj[key] : undefined
        processObject(enValue, langSubObj, targetObj[key])
      } else {
        // For primitive values
        if (langObj && key in langObj) {
          const langValue = langObj[key]
          if (typeof langValue === 'string' && langValue.startsWith('TODO:')) {
            // Update TODO translation with current English text
            targetObj[key] = `TODO: \`${enValue}\``
          } else {
            // Keep existing translation
            targetObj[key] = langValue
          }
        } else {
          // Add missing key with TODO translation
          targetObj[key] = `TODO: \`${enValue}\``
        }
      }
    }
  }

  processObject(enMessages, langMessages, result)
  return result
}

// ===== MAIN CLASS =====

/**
 * Configuration options for I18nAlignmentChecker
 */
export interface I18nAlignmentCheckerOptions {
  /**
   * Reference locale key to check against (e.g., 'en', 'zh-CN')
   * @default 'en'
   */
  referenceLocale?: string
}

/**
 * I18n Alignment Checker
 *
 * Checks and fixes alignment issues between language files and the reference locale file.
 *
 * @example
 * ```ts
 * // Basic usage
 * const checker = new I18nAlignmentChecker('/path/to/i18n/messages')
 *
 * const results = await checker.check()
 * checker.printAlignmentResults(results)
 *
 * // Fix alignment issues
 * const fixedCount = await checker.fix(results)
 * ```
 */
export class I18nAlignmentChecker {
  private readonly localesDir: string
  private readonly referenceLocale: string

  constructor (localesDir: string, options: I18nAlignmentCheckerOptions = {}) {
    this.localesDir = localesDir
    this.referenceLocale = options.referenceLocale ?? 'en'
  }

  /**
   * Check alignment between reference locale and other language files
   *
   * @returns Array of language file results
   * @throws Error if reference locale file is not found
   */
  async check (): Promise<{
    enKeys: string[]
    results: LanguageFileResult[]
  }> {
    // Load reference locale file
    const referenceFilePath = path.join(this.localesDir, `${this.referenceLocale}.json`)
    if (!fs.existsSync(referenceFilePath)) {
      throw new Error(`Reference file not found: ${referenceFilePath}`)
    }

    const enMessages = loadMessages(referenceFilePath)
    const enKeys = extractMessageKeys(enMessages)

    console.debug(`📊 Reference ${this.referenceLocale}.json contains ${enKeys.length} keys\n`)

    // Get all language files except reference locale
    const langFiles = fs
      .readdirSync(this.localesDir)
      .filter(file => file.endsWith('.json') && file !== `${this.referenceLocale}.json`)
      .sort()

    if (langFiles.length === 0) {
      console.debug(`✅ No other language files found to check alignment with ${this.referenceLocale}.json.`)
      return { enKeys, results: []}
    }

    const results: LanguageFileResult[] = []

    // Check each language file
    for (const langFile of langFiles) {
      const langFilePath = path.join(this.localesDir, langFile)
      const langMessages = loadMessages(langFilePath)
      const alignment = this.checkAlignment(enKeys, langMessages)

      results.push({
        file: langFile,
        path: langFilePath,
        alignment,
        messages: langMessages,
      })
    }

    return { enKeys, results }
  }

  /**
   * Check alignment between reference keys and language messages
   *
   * @param enKeys - Reference translation keys from reference locale
   * @param langMessages - Language messages to check
   * @returns Alignment result
   */
  private checkAlignment (enKeys: string[], langMessages: Record<string, any>): AlignmentResult {
    const langKeys = extractMessageKeys(langMessages)
    const langKeySet = new Set(langKeys)
    const enKeySet = new Set(enKeys)

    // Find missing keys (in reference locale but not in language file)
    const missingKeys = enKeys.filter(key => !langKeySet.has(key))

    // Find extra keys (in language file but not in reference locale)
    const extraKeys = langKeys.filter(key => !enKeySet.has(key))

    return {
      missing: missingKeys,
      extra: extraKeys,
      total: langKeys.length,
      aligned: missingKeys.length === 0 && extraKeys.length === 0,
    }
  }

  /**
   * Print alignment check results
   *
   * @param results - Array of language file results
   */
  printAlignmentResults (results: LanguageFileResult[]): void {
    for (const { file, alignment } of results) {
      console.debug(`📁 ${file}:`)
      console.debug(`   Total keys: ${alignment.total}`)

      if (alignment.missing.length > 0) {
        console.debug(`   ❌ Missing keys: ${alignment.missing.length}`)
        alignment.missing.forEach(key => {
          console.debug(`      - "${key}"`)
        })
      }

      if (alignment.extra.length > 0) {
        console.debug(`   ⚠️  Extra keys: ${alignment.extra.length}`)
        alignment.extra.forEach(key => {
          console.debug(`      - "${key}"`)
        })
      }

      if (alignment.aligned) {
        console.debug(`   ✅ Aligned with ${this.referenceLocale}.json`)
      }

      console.debug()
    }

    // Summary
    const totalIssues = results.reduce(
      (sum, r) => sum + r.alignment.missing.length + r.alignment.extra.length,
      0,
    )

    if (totalIssues === 0) {
      console.debug(`✅ All language files are aligned with ${this.referenceLocale}.json!`)
    } else {
      const affectedFiles = results.filter(r => !r.alignment.aligned).length
      console.debug(`📊 Summary: ${totalIssues} alignment issues found across ${affectedFiles} files\n`)
    }
  }

  /**
   * Fix alignment issues by removing extra keys, adding missing keys, and sorting
   *
   * @param results - Array of language file results
   * @returns Number of files fixed
   */
  async fix (results: LanguageFileResult[]): Promise<number> {
    console.debug('🔧 Fixing alignment issues and sorting keys...\n')

    // Sort reference locale keys first
    const referenceFilePath = path.join(this.localesDir, `${this.referenceLocale}.json`)
    const enMessages = loadMessages(referenceFilePath)
    const sortedEnMessages = sortObjectKeys(enMessages)

    console.debug(`🔧 Processing ${this.referenceLocale}.json...`)
    fs.writeFileSync(referenceFilePath, JSON.stringify(sortedEnMessages, null, 2) + '\n', 'utf-8')
    console.debug('   🔄 Sorted keys alphabetically')
    console.debug(`   ✅ ${this.referenceLocale}.json processed successfully\n`)

    let fixedCount = 0

    for (const result of results) {
      console.debug(`🔧 Processing ${result.file}...`)

      // Remove extra keys from messages
      const cleanedMessages = JSON.parse(JSON.stringify(result.messages))
      for (const extraKey of result.alignment.extra) {
        removeKeyAtPath(cleanedMessages, extraKey)
        cleanupEmptyObjects(cleanedMessages, extraKey)
      }

      // Rebuild with sorted order and missing keys
      const fixedMessages = rebuildWithOrder(sortedEnMessages, cleanedMessages)

      // Write back to file
      fs.writeFileSync(result.path, JSON.stringify(fixedMessages, null, 2) + '\n', 'utf-8')

      const removedCount = result.alignment.extra.length
      const addedCount = result.alignment.missing.length

      if (removedCount > 0 || addedCount > 0) {
        console.debug(`   ➖ Removed ${removedCount} extra keys`)
        console.debug(`   ➕ Added ${addedCount} missing keys`)
      }
      console.debug('   🔄 Updated TODO translations with current English text')
      console.debug('   🔄 Sorted keys alphabetically')
      console.debug(`   ✅ ${result.file} processed successfully\n`)

      fixedCount++
    }

    console.debug('✅ All files have been processed, sorted, and updated!')
    return fixedCount
  }
}
