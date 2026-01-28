import fs from 'node:fs'
import path from 'node:path'
import { createUnplugin } from 'unplugin'
import { glob } from 'glob'
import { get, merge, set } from 'lodash-es'
import { pathToNamespace } from './utils'

/**
 * Plugin options interface
 */
interface I18nMergePluginOptions {
  srcDir: string | string[]
  outputDir: string
  languages?: string[]
  sortOriginalFiles?: boolean
  /**
   * Namespace mapping for source directories
   * Example: { 'app': '', 'server': 'server' }
   * - 'app' directory files will have no prefix (default behavior)
   * - 'server' directory files will be under 'server' namespace
   */
  srcDirNamespaces?: Record<string, string>
  /**
   * Callback function invoked after merge is complete
   * Useful for running additional processing like alignment checks
   */
  onMergeComplete?: () => void | Promise<void>
}

/**
 * Internal normalized options
 */
interface NormalizedI18nMergePluginOptions {
  srcDirs: string[]
  outputDir: string
  languages: string[]
  sortOriginalFiles: boolean
  srcDirNamespaces: Record<string, string>
}

/**
 * I18n merge plugin core for Vite/Webpack
 * Implements the proximity maintenance principle for i18n files
 * Features:
 * - Automatic scanning and merging of all language files from app directory
 * - Namespace mapping based on directory structure
 * - Development mode file watching for automatic recompilation
 * - Support for multiple languages with consistent namespace structure
 * - Always applies alphabetical sorting to merged output files
 * - Special handling: removes [locale] from anywhere in namespace paths
 * - Optional sortOriginalFiles: sorts source files before merging (two-pass process)
 */
export class I18nMergePluginCore {
  private options: NormalizedI18nMergePluginOptions

  constructor (options: I18nMergePluginOptions) {
    // Normalize srcDir to always be an array internally
    const srcDirs = Array.isArray(options.srcDir) ? options.srcDir : [ options.srcDir ]

    this.options = {
      srcDirs,
      outputDir: options.outputDir,
      languages: options.languages ?? [ 'en' ],
      sortOriginalFiles: options.sortOriginalFiles ?? false,
      srcDirNamespaces: options.srcDirNamespaces ?? {},
    }
  }

  /**
   * Get files by directory for a specific language
   */
  private getFilesByDir (language: string): Array<{ srcDir: string, files: string[] }> {
    const { srcDirs } = this.options
    return srcDirs.map(dir => ({
      srcDir: dir,
      files: glob.sync(`${dir}/**/${language}.json`),
    }))
  }

  /**
   * Get all i18n JSON files from all source directories
   */
  getAllI18nFiles (): string[] {
    const { languages } = this.options
    return languages.flatMap(lang =>
      this.getFilesByDir(lang).flatMap(({ files }) => files),
    )
  }

  /**
   * Main merge function - processes all language files
   */
  async mergeI18nFiles (): Promise<void> {
    try {
      await Promise.all(this.options.languages.map(lang => this.mergeLanguageFiles(lang)))
    } catch (error) {
      console.error('❌ Failed to merge i18n files:', (error as Error).message)
      throw error
    }
  }

  /**
   * Merge all files for a specific language
   */
  async mergeLanguageFiles (language: string): Promise<void> {
    const { outputDir, sortOriginalFiles } = this.options

    // Get all files from all source directories with their source directory info
    const filesByDir = this.getFilesByDir(language)
    const allFiles = filesByDir.flatMap(({ files }) => files)

    // Sort original files first if option is enabled
    if (sortOriginalFiles) {
      let hasChanges = false

      for (const file of allFiles) {
        const fileChanged = this.sortFile(file)
        if (fileChanged) {
          hasChanges = true
        }
      }

      // If any files were changed during sorting, stop merge operation
      // Wait for the next file change trigger to proceed
      if (hasChanges) {
        console.debug('⏸️  Files were sorted, waiting for next trigger to proceed with merge')
        return
      }
    }

    // Merge files with namespace calculated relative to their source directory
    const merged = filesByDir.reduce((acc, { srcDir, files }) => {
      files.forEach(file => {
        try {
          const messages = JSON.parse(fs.readFileSync(file, 'utf8'))
          const prefix = this.options.srcDirNamespaces[srcDir]
          const namespace = pathToNamespace(file, srcDir, prefix)
          this.mergeMessagesIntoNamespace(acc, namespace, messages)
        } catch (error) {
          console.error(`❌ Failed to process ${file}:`, (error as Error).message)
        }
      })
      return acc
    }, {})

    const outputPath = path.join(outputDir, `${language}.json`)
    this.ensureDirectoryExists(path.dirname(outputPath))
    fs.writeFileSync(outputPath, JSON.stringify(this.sortObjectKeys(merged), null, 2) + '\n')
    console.debug(`📄 Generated ${outputPath}`)
  }

  /**
   * Merge messages into namespace structure
   */
  mergeMessagesIntoNamespace (target: any, namespace: string, messages: any): void {
    // If no namespace, merge directly at root level
    if (!namespace) {
      merge(target, messages)
      return
    }

    // Remove leading or trailing dots
    // Example:
    //   ".pages.dashboard" -> "pages.dashboard"
    //   "pages.dashboard." -> "pages.dashboard"
    const cleanedNamespace = namespace.replace(/^\.|\.$/g, '')

    // Convert namespace string to array path to preserve brackets in segment names
    // lodash.set() interprets [xxx] as array index notation when using string paths
    // Using array path prevents this: 'pages.[id]' -> ['pages', '[id]']
    const pathArray = cleanedNamespace.split('.')

    // Get existing value at namespace path or default to empty object
    const existingValue = get(target, pathArray, {})

    // Merge existing value with new messages and set back to namespace path
    set(target, pathArray, { ...existingValue, ...messages })
  }

  /**
   * Sort individual file content and check if it changed
   * Returns true if file content was modified, false otherwise
   */
  sortFile (filePath: string): boolean {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf8')
      const parsedContent = JSON.parse(originalContent)
      const sortedContent = this.sortObjectKeys(parsedContent)
      const sortedString = JSON.stringify(sortedContent, null, 2)

      // Compare original and sorted content
      if (originalContent.trim() !== sortedString.trim()) {
        fs.writeFileSync(filePath, sortedString)
        console.debug(`📝 Sorted ${filePath}`)
        return true
      }

      return false
    } catch (error) {
      console.error(`❌ Failed to sort ${filePath}:`, (error as Error).message)
      return false
    }
  }

  /**
   * Sort object keys alphabetically (recursive)
   */
  sortObjectKeys (obj: any): any {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj

    return Object.keys(obj)
      .sort()
      .reduce((sorted: any, key) => {
        sorted[key] = this.sortObjectKeys(obj[key])
        return sorted
      }, {})
  }

  /**
   * Ensure directory exists
   */
  ensureDirectoryExists (dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  /**
   * Check if file is an i18n file
   */
  isI18nFile (id: string): boolean {
    const { languages } = this.options
    return languages.some(lang => id.endsWith(`/${lang}.json`))
  }
}

/**
 * Create unplugin instance
 */
export const I18nMergePlugin = createUnplugin((options: I18nMergePluginOptions) => {
  const core = new I18nMergePluginCore(options)
  const { onMergeComplete } = options
  let initialized = false
  let isProcessing = false

  return {
    name: 'i18n-merge-plugin',

    // Build start hook - initial compilation
    async buildStart () {
      if (!initialized) {
        console.debug(`\n${'='.repeat(60)}`)
        console.debug('🚀 Initial i18n compilation')
        await core.mergeI18nFiles()
        await onMergeComplete?.()
        initialized = true
        console.debug(`${'='.repeat(60)}`)

        // Add all i18n files to watch list
        const files = core.getAllI18nFiles()
        files.forEach(file => {
          this.addWatchFile(file)
        })
      }
    },

    // Watch file changes in development mode
    async watchChange (id) {
      // Prevent processing if already in progress
      if (isProcessing) {
        return
      }

      if (core.isI18nFile(id)) {
        console.debug(`\n${'='.repeat(60)}`)
        console.debug('🔄 i18n file changed:', id)
        isProcessing = true

        try {
          await core.mergeI18nFiles()
          await onMergeComplete?.()
        } finally {
          isProcessing = false
          console.debug(`${'='.repeat(60)}`)
        }
      }
    },

    // Webpack-specific implementation
    webpack (compiler) {
      // Add all i18n files to webpack's watch list
      compiler.hooks.afterCompile.tap('I18nMergePlugin', (compilation: any) => {
        core.getAllI18nFiles().forEach(file => {
          compilation.fileDependencies.add(path.resolve(file))
        })
      })
    },
  }
})

export default I18nMergePlugin
