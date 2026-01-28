import fs from 'node:fs'
import path from 'node:path'
import { glob } from 'glob'

// ===== CONSTANTS =====

/**
 * Default custom translation function factory methods
 * These factories return translation functions that support namespace
 */
export const DEFAULT_TRANSLATION_FACTORIES = [ 'useTranslations', 'getTranslations' ]

/**
 * Predefined i18n library configurations
 * Currently supports vue-i18n, can be extended for other libraries in the future
 */
export const I18N_LIBRARIES = {
  'vue-i18n': {
    // Composables that return translation methods (no namespace support)
    composables: [ 'useI18n' ],
    // Methods returned from composables (translation-related only)
    methods: [ 't', 'te', 'tm', 'rt' ],
    // Global methods available without declaration (translation-related only)
    globalMethods: [ '$t', '$te', '$tm', '$rt' ],
    // Template attributes for translation keys
    keyAttributes: [ 'keypath' ],
    // Fields in definePageMeta that contain i18n keys
    pageMetaFields: [ 'title' ],
  },
} as const

// ===== TYPE DEFINITIONS =====

/**
 * Variable declaration from translation factory functions
 */
export interface VariableDeclaration {
  variableName: string // The variable name in code
  namespace: string // Namespace parameter passed to factory, empty string if not provided
  line: number
}

/**
 * Translation key usage information
 */
export interface KeyUsageEntry {
  file: string
  line: number
  column: number
  key: string
  fullKey: string
  namespace: string // Namespace for the key, empty string for keys without namespace
  functionName: string
  quoteType: string
  isDynamic: boolean // true if from dynamic binding like :keypath or template literal
}

/**
 * Extracted key match result
 */
interface KeyMatch {
  key: string
  quoteType: string
  functionName: string
  match: RegExpExecArray
}

/**
 * Configuration for i18n usage scanning
 */
export interface I18nScannerConfig {
  translationFactories: string[]
  i18nComposables: readonly string[]
  i18nMethods: readonly string[]
  i18nGlobalMethods: readonly string[]
  keyAttributes: readonly string[]
  pageMetaFields: readonly string[]
}

// ===== PUBLIC API =====

/**
 * Load messages from a JSON language file
 *
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON object
 *
 * @example
 * ```ts
 * const messages = loadMessages('i18n/messages/en.json')
 * ```
 */
export function loadMessages (filePath: string): Record<string, any> {
  const content = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(content)
}

/**
 * Convert locale file path to namespace according to i18n merge rules
 *
 * Brackets in path segments are converted to underscores because vue-i18n's
 * path resolution interprets brackets as array index notation.
 *
 * @param filePath - Absolute path to the locale file
 * @param rootDir - Root directory that this file belongs to
 * @param prefix - Optional namespace prefix for this source directory
 * @returns Namespace string (empty string for root files)
 *
 * @example
 * ```ts
 * // Root directory files return empty string
 * pathToNamespace('/project/app/en.json', '/project/app')
 * // Returns: ''
 *
 * // Nested files use directory structure as namespace
 * pathToNamespace('/project/app/pages/dashboard/en.json', '/project/app')
 * // Returns: 'pages.dashboard'
 *
 * // With prefix 'server'
 * pathToNamespace('/project/server/api/auth/en.json', '/project/server', 'server')
 * // Returns: 'server.api.auth'
 *
 * // Special handling for [locale] segments
 * pathToNamespace('/project/app/pages/[locale]/dashboard/en.json', '/project/app')
 * // Returns: 'pages.dashboard' (removes [locale])
 *
 * // Dynamic route segments [xxx] are converted to _xxx_
 * pathToNamespace('/project/app/pages/users/[id]/en.json', '/project/app')
 * // Returns: 'pages.users._id_'
 *
 * // Optional route segments [[slug]] are converted to __slug__
 * pathToNamespace('/project/app/pages/[[slug]]/en.json', '/project/app')
 * // Returns: 'pages.__slug__'
 *
 * // Catch-all routes [...slug] are converted to ___slug
 * pathToNamespace('/project/app/pages/[...slug]/en.json', '/project/app')
 * // Returns: 'pages.___slug'
 * ```
 */
export function pathToNamespace (
  filePath: string,
  rootDir: string,
  prefix?: string,
): string {
  const dir = path.dirname(path.relative(rootDir, filePath))

  // If directory is root (.), use only the prefix (or empty string)
  if (dir === '.') return prefix || ''

  // Remove [locale] from the path while preserving other directory names exactly
  const cleanedDir = dir
    .replace(/\[locale\]/g, '') // Remove [locale] segments for i18n routing
    .replace(/\/+/g, '/') // Remove duplicate slashes
    .replace(/^\/|\/$/g, '') // Remove leading/trailing slashes

  // Split by path separators to handle each segment individually
  const pathSegments = cleanedDir.split(/[/\\]/)

  // Convert each segment to a valid namespace identifier
  // Brackets are not supported in vue-i18n path resolution (treated as array index)
  const processedSegments = pathSegments.map((segment: string) => {
    // Handle optional routes: [[slug]] -> __slug__
    if (segment.startsWith('[[') && segment.endsWith(']]')) {
      const inner = segment.slice(2, -2)
      return `__${inner}__`
    }
    // Handle catch-all routes: [...slug] -> ___slug
    if (segment.startsWith('[...') && segment.endsWith(']')) {
      const inner = segment.slice(4, -1)
      return `___${inner}`
    }
    // Handle dynamic routes: [id] -> _id_
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const inner = segment.slice(1, -1)
      return `_${inner}_`
    }
    return segment
  })

  // Join with dots
  const pathNamespace = processedSegments.join('.')

  // Combine prefix with path namespace
  if (prefix) {
    return `${prefix}.${pathNamespace}`
  }

  return pathNamespace
}

/**
 * Find all i18n key usage in source files
 *
 * @param srcDir - Source directory to scan
 * @param config - Scanner configuration
 * @returns Map of full keys to usage entries
 */
export async function findI18nUsage (
  srcDir: string,
  config: I18nScannerConfig,
): Promise<Map<string, KeyUsageEntry[]>> {
  const usage = new Map<string, KeyUsageEntry[]>()
  // Use ** to match any characters including dots, supporting files like .post.ts, .get.ts, etc.
  const files = await glob(`${srcDir}/**/*.{ts,tsx,js,jsx,vue}`, {
    ignore: [ '**/node_modules/**', '**/.nuxt/**', '**/dist/**', '**/*.d.ts' ],
  })

  // Precompile regex patterns
  const translationFactoriesPattern = config.translationFactories.join('|')
  const i18nComposablesPattern = config.i18nComposables.join('|')

  // Match any identifier function call (direct or object method) with string literal or variable
  // Captures: [1] function name, [2] quote type (empty for variables), [3] string value or variable name
  // Note: Template literals (backticks) may contain single/double quotes inside ${...},
  // so we use a separate pattern that allows quotes within template literals.
  const anyCallRegex = new RegExp(
    '(?<![a-zA-Z0-9_])(\\$?[a-zA-Z_$][a-zA-Z0-9_$.]*)\\s*\\(\\s*(?:'
    + '(`)((?:[^`\\\\]|\\\\.)*)\\2|' // Template literal: allows any char except unescaped backtick
    + '([\'"])([^\'"]+?)\\4|' // Single/double quoted string
    + '([a-zA-Z_$][a-zA-Z0-9_$.]*)' // Variable reference
    + ')\\s*(?:,|\\))',
    'g',
  )

  // Match translation factory assignments
  // Captures: [1] variable name, [2] factory function name, [3] all arguments
  // Also supports async/await: const t = await getTranslations(...)
  const factoryAssignmentRegex = new RegExp(
    `const\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*=\\s*(?:await\\s+)?(${translationFactoriesPattern})\\s*\\(((?:[^)'"\`]|'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"|\`(?:[^\`\\\\]|\\\\.)*\`)*)\\)`,
    'g',
  )

  // Match i18n composable destructuring
  const i18nDestructuringRegex = new RegExp(
    `\\{\\s*([a-zA-Z_$][a-zA-Z0-9_$,:\\s]*)\\}\\s*=\\s*(${i18nComposablesPattern})\\s*\\(\\s*\\)`,
    'g',
  )

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split('\n')
    const relativeFile = file.replace(process.cwd() + '/', '')

    // Extract variable declarations
    const declarations = extractVariableDeclarations(
      content,
      factoryAssignmentRegex,
      i18nDestructuringRegex,
    )

    // Process each line
    lines.forEach((line, lineIndex) => {
      // Extract keys from method calls
      const methodMatches = extractMethodKeys(line, anyCallRegex, declarations, config)
      processKeyMatches(
        methodMatches,
        lineIndex,
        relativeFile,
        declarations,
        usage,
        config,
        content,
      )

      // Extract keys from template attributes
      const attributeMatches = extractAttributeKeys(line, config.keyAttributes)
      processKeyMatches(
        attributeMatches,
        lineIndex,
        relativeFile,
        declarations,
        usage,
        config,
        content,
      )

      // Extract keys from definePageMeta fields
      const pageMetaMatches = extractPageMetaFieldKeys(line, config.pageMetaFields)
      processKeyMatches(
        pageMetaMatches,
        lineIndex,
        relativeFile,
        declarations,
        usage,
        config,
        content,
      )
    })
  }

  return usage
}

/**
 * Extract all keys from nested message structure in dot notation
 *
 * @param messages - Nested message object to extract keys from
 * @param parentKey - Parent key prefix for nested keys
 * @returns Array of extracted keys in dot notation
 *
 * @example
 * ```ts
 * const messages = {
 *   common: {
 *     action: {
 *       save: 'Save',
 *       cancel: 'Cancel'
 *     }
 *   }
 * }
 * extractMessageKeys(messages)
 * // Returns: ['common.actions.save', 'common.actions.cancel']
 * ```
 */
export function extractMessageKeys (messages: Record<string, any>, parentKey = ''): string[] {
  const keys: string[] = []

  for (const [ key, value ] of Object.entries(messages)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key

    if (typeof value === 'object' && value !== null) {
      keys.push(...extractMessageKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }

  return keys
}

/**
 * Extract string variables from file content
 *
 * @param content - File content to scan
 * @returns Map of variable names to their string values
 *
 * @example
 * ```ts
 * const content = `
 *   const ns = 'pages.dashboard'
 *   const message = 'hello'
 * `
 * extractStringVariables(content)
 * // Returns: Map { 'ns' => 'pages.dashboard', 'message' => 'hello' }
 * ```
 */
export function extractStringVariables (content: string): Map<string, string> {
  const namespaceVars = new Map<string, string>()
  // Match: const variableName = 'namespace.value'
  const regex = /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*['"`]([a-zA-Z][a-zA-Z0-9_.]*?)['"`]/g

  for (const match of content.matchAll(regex)) {
    const varName = match[1]!
    const value = match[2]!
    // Only store if the value looks like a namespace (contains dots or is a valid identifier)
    if (value.includes('.') || /^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
      namespaceVars.set(varName, value)
    }
  }

  return namespaceVars
}

/**
 * Replace variables in a template literal key
 *
 * @param key - Template literal key that may contain ${varName}
 * @param variables - Map of variable names to their values
 * @returns Processed key with variables replaced
 *
 * @example
 * ```ts
 * const variables = new Map([['ns', 'pages.dashboard']])
 *
 * replaceVariables('${ns}.name', variables)
 * // Returns: 'pages.dashboard.name'
 *
 * replaceVariables('${ns}.status.${status}', variables)
 * // Returns: 'pages.dashboard.status.${status}'
 * ```
 */
export function replaceVariables (key: string, variables: Map<string, string>): string {
  return key.replace(/\$\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g, (match, varName) => {
    // Check if this variable is in the map
    if (variables.has(varName)) {
      return variables.get(varName)!
    }
    // Keep the original ${...} if not found
    return match
  })
}

/**
 * Extract namespace from function arguments string
 *
 * @param argsString - String containing all function arguments
 * @param stringVariables - Map of known string variables
 * @returns Extracted namespace string or empty string
 *
 * @example
 * ```ts
 * const stringVars = new Map([['ns', 'common']])
 *
 * extractNamespaceFromArgs("'server.errors'", stringVars)
 * // Returns: 'server.errors'
 *
 * extractNamespaceFromArgs("event, 'namespace'", stringVars)
 * // Returns: 'namespace'
 *
 * extractNamespaceFromArgs("event, ns", stringVars)
 * // Returns: 'common'
 *
 * extractNamespaceFromArgs("", stringVars)
 * // Returns: ''
 * ```
 */
export function extractNamespaceFromArgs (
  argsString: string,
  stringVariables: Map<string, string>,
): string {
  if (!argsString.trim()) {
    return ''
  }

  // Find all string literals (with quotes)
  const stringMatches = [ ...argsString.matchAll(/['"`]([^'"`]+)['"`]/g) ]

  if (stringMatches.length > 0) {
    // Prioritize strings that contain dots (more likely to be namespace)
    const namespaceCandidate = stringMatches.find(m => m[1]!.includes('.')) || stringMatches[stringMatches.length - 1]
    return namespaceCandidate![1]!
  }

  // If no string literals, extract all identifiers (variables)
  const identifiers = argsString
    .split(',')
    .map(s => s.trim())
    .filter(s => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(s))

  if (identifiers.length > 0) {
    // Use the last identifier and try to resolve it
    const lastIdentifier = identifiers[identifiers.length - 1]!
    return stringVariables.get(lastIdentifier) || ''
  }

  return ''
}

// ===== PRIVATE UTILITY FUNCTIONS =====

/**
 * Find the nearest variable declaration for a given usage
 *
 * @example
 * ```ts
 * const declarations = [
 *   { variableName: 'T', namespace: 'common', line: 5 },
 *   { variableName: 'T', namespace: 'app', line: 10 }
 * ]
 * findNearestDeclaration(12, 'T', declarations)
 * // Returns: { variableName: 'T', namespace: 'app', line: 10 }
 * ```
 */
function findNearestDeclaration (
  usageLine: number,
  variableName: string,
  declarations: VariableDeclaration[],
): VariableDeclaration | null {
  const candidates = declarations.filter(
    decl => decl.variableName === variableName && decl.line < usageLine,
  )

  if (candidates.length === 0) {
    return null
  }

  return candidates.reduce((nearest, current) =>
    current.line > nearest.line ? current : nearest,
  )
}

/**
 * Process all key matches and add to usage map
 */
function processKeyMatches (
  matches: KeyMatch[],
  lineIndex: number,
  relativeFile: string,
  declarations: VariableDeclaration[],
  usage: Map<string, KeyUsageEntry[]>,
  config: I18nScannerConfig,
  content: string,
): void {
  // Extract string variables from this file
  const stringVars = extractStringVariables(content)

  for (const { key, quoteType, functionName, match } of matches) {
    const namespace = resolveNamespaceForKey(functionName, lineIndex, declarations, config)

    // Process the key to replace string variables if present
    let processedKey = key

    // For template literals with ${...}, try to replace known string variables
    if (quoteType === '`' && key.includes('${')) {
      processedKey = replaceVariables(key, stringVars)
    }

    // Mark as dynamic if it's a template literal with remaining ${...}
    // Variable references (no quote) with ${...} are NOT marked as dynamic here
    // but will be converted to wildcards during validation
    const isDynamic = quoteType === '`' && processedKey.includes('${')

    const fullKey = namespace ? `${namespace}.${processedKey}` : processedKey

    const entry: KeyUsageEntry = {
      file: relativeFile,
      line: lineIndex + 1,
      column: match.index + 1,
      key: processedKey,
      fullKey,
      namespace,
      functionName,
      quoteType,
      isDynamic,
    }

    if (!usage.has(fullKey)) {
      usage.set(fullKey, [])
    }
    usage.get(fullKey)!.push(entry)
  }
}

/**
 * Extract translation variable declarations from factory functions
 */
function extractVariableDeclarations (
  content: string,
  factoryAssignmentRegex: RegExp,
  i18nDestructuringRegex: RegExp,
): VariableDeclaration[] {
  const lines = content.split('\n')
  const declarations: VariableDeclaration[] = []

  // First pass: Build a map of string variable assignments
  // Example: const namespace = 'common'
  const stringVariables = new Map<string, string>()
  const stringVarRegex = /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*['"`]([^'"`]+)['"`]/g

  content.replace(stringVarRegex, (match, varName, value) => {
    stringVariables.set(varName, value)
    return match
  })

  lines.forEach((line, lineIndex) => {
    // Pattern 1: Translation factory assignments (support namespace)
    for (const match of line.matchAll(factoryAssignmentRegex)) {
      const variableName = match[1]! // Group 1: variable name
      // match[2] is the factory function name (getTranslations|useTranslations)
      const argsString = match[3]! // Group 3: all arguments as a string

      // Extract namespace from arguments
      const namespace = extractNamespaceFromArgs(argsString, stringVariables)

      declarations.push({
        variableName,
        namespace,
        line: lineIndex,
      })
    }

    // Pattern 2: i18n composable destructuring (no namespace support)
    for (const match of line.matchAll(i18nDestructuringRegex)) {
      const destructuredVars = match[1]!

      // Parse destructured variables
      const varParts = destructuredVars.split(',').map(v => v.trim())
      for (const varPart of varParts) {
        // Handle renamed: { t: myT } → use 'myT'
        // Handle simple: { t } → use 't'
        const renameParts = varPart.split(':').map(v => v.trim())
        const variableName = (renameParts.length > 1 ? renameParts[1] : renameParts[0])!

        declarations.push({
          variableName,
          namespace: '', // i18n methods don't support namespace
          line: lineIndex,
        })
      }
    }
  })

  return declarations
}

/**
 * Extract all key matches from translation method calls
 */
function extractMethodKeys (
  line: string,
  anyCallRegex: RegExp,
  declarations: VariableDeclaration[],
  config: I18nScannerConfig,
): KeyMatch[] {
  const matches: KeyMatch[] = []

  // Unified pattern: Match any identifier function call with string literal or variable reference
  // Capture groups:
  //   [1] function name
  //   [2] backtick (for template literal)
  //   [3] template literal content
  //   [4] single/double quote
  //   [5] single/double quoted string content
  //   [6] variable reference
  for (const match of line.matchAll(anyCallRegex)) {
    const functionName = match[1]! // Full identifier (e.g., 'T', 'commonT', 'i18n.t', '$t')
    const templateLiteralValue = match[3] // Template literal content (if backtick)
    const quotedStringValue = match[5] // Single/double quoted string content
    const variableRef = match[6] // Variable reference (if not quoted)

    // Determine the key and quoteType
    // For variables, wrap in ${...} and treat as template literal for uniform handling
    let key: string
    let quoteType: string

    if (templateLiteralValue !== undefined) {
      key = templateLiteralValue
      quoteType = '`'
    } else if (quotedStringValue !== undefined) {
      key = quotedStringValue
      quoteType = match[4]! // single or double quote
    } else if (variableRef) {
      key = `\${${variableRef}}`
      quoteType = '`'
    } else {
      continue // No valid key found
    }

    // Extract the base variable name and method name
    const parts = functionName.split('.')
    const baseVariableName = parts[0]!
    const methodName = parts[parts.length - 1]!

    // Check if this is a global translation method
    const isGlobalMethod = config.i18nGlobalMethods.includes(baseVariableName)

    // Check if this identifier has a declaration
    const hasDeclaration = declarations.some(decl => decl.variableName === baseVariableName)

    // Validation rules
    if (!isGlobalMethod && !hasDeclaration) continue

    // For object method calls (e.g., i18n.t), ensure the method is valid
    const isObjectMethodCall = parts.length > 1
    if (isObjectMethodCall && !config.i18nMethods.includes(methodName)) {
      continue
    }

    matches.push({
      key,
      quoteType,
      functionName,
      match,
    })
  }

  return matches
}

/**
 * Extract i18n keys from definePageMeta fields
 *
 * Matches patterns like:
 * - definePageMeta({ title: 'pages.app.wallets.title' })
 * - definePageMeta({ layout: 'app', title: 'pages.app.wallets.title' })
 * - definePageMeta({ title: `pages.app.wallets.${dynamic}` })
 *
 * @param line - Line of code to scan
 * @param pageMetaFields - Array of field names to check (e.g., ['title'])
 */
function extractPageMetaFieldKeys (line: string, pageMetaFields: readonly string[]): KeyMatch[] {
  const matches: KeyMatch[] = []

  for (const fieldName of pageMetaFields) {
    // Match field property: fieldName: 'key' or fieldName: "key" or fieldName: `key`
    const fieldRegex = new RegExp(`\\b${fieldName}\\s*:\\s*(['"\`])([^'"\`]+?)\\1`, 'g')

    for (const match of line.matchAll(fieldRegex)) {
      const quoteType = match[1]!
      const key = match[2]!

      // Only consider keys that look like i18n keys (contain dots)
      if (key.includes('.')) {
        matches.push({
          key,
          quoteType,
          functionName: `definePageMeta.${fieldName}`,
          match,
        })
      }
    }
  }

  return matches
}

/**
 * Extract all key matches from template attributes
 */
function extractAttributeKeys (line: string, keyAttributes: readonly string[]): KeyMatch[] {
  const matches: KeyMatch[] = []

  for (const attrName of keyAttributes) {
    // Pattern 1: Static binding - keypath="full.key"
    const staticMatches = [ ...line.matchAll(new RegExp(`\\b${attrName}\\s*=\\s*(['"])([^'"]+?)\\1`, 'g')) ]
    for (const match of staticMatches) {
      // Check if this is actually a dynamic binding by looking backwards
      const matchStart = match.index!
      const beforeMatch = line.substring(Math.max(0, matchStart - 10), matchStart)
      const isDynamicBinding = /:\s*$/.test(beforeMatch) || /v-bind:\s*$/.test(beforeMatch)

      if (!isDynamicBinding) {
        matches.push({
          key: match[2]!,
          quoteType: match[1]!,
          functionName: attrName,
          match,
        })
      }
    }

    // Pattern 2: Dynamic binding - :keypath="`${ns}.save`" or :keypath="'common.save'"
    const dynamicRegex = new RegExp(`(?::+|v-bind:)${attrName}\\s*=\\s*(['"])(.*?)\\1`, 'g')

    for (const match of line.matchAll(dynamicRegex)) {
      const jsExpression = match[2]!

      // Extract key from JS expression
      let key: string
      let quoteType: string

      const quoteMatch = jsExpression.match(/^(['"`])(.*)\1$/)
      if (quoteMatch) {
        quoteType = quoteMatch[1]!
        key = quoteMatch[2]!
      } else {
        // Variable or expression: wrap in ${...} and treat as template literal
        quoteType = '`'
        key = `\${${jsExpression}}`
      }

      matches.push({
        key,
        quoteType,
        functionName: `:${attrName}`,
        match,
      })
    }
  }

  return matches
}

/**
 * Resolve namespace for a given function name and variable
 */
function resolveNamespaceForKey (
  functionName: string,
  lineIndex: number,
  declarations: VariableDeclaration[],
  config: I18nScannerConfig,
): string {
  // definePageMeta fields don't support namespace (already contains full key path)
  if (functionName.startsWith('definePageMeta.')) {
    const fieldName = functionName.replace('definePageMeta.', '')
    if (config.pageMetaFields.includes(fieldName)) {
      return ''
    }
  }

  // Template attributes don't support namespace
  const cleanFunctionName = functionName.startsWith(':') ? functionName.slice(1) : functionName
  if (config.keyAttributes.includes(cleanFunctionName)) {
    return ''
  }

  // Extract base variable name and method name
  const parts = functionName.split('.')
  const methodName = parts[parts.length - 1]!
  const variableName = (parts.length > 1 ? parts[0] : methodName)!

  // First, try to find a declaration (from translation factories)
  // This takes priority over global/library methods check
  const declaration = findNearestDeclaration(lineIndex, variableName, declarations)
  if (declaration) {
    return declaration.namespace || ''
  }

  // If no declaration found, check if it's a global or library method (no namespace support)
  if (config.i18nGlobalMethods.includes(variableName) || config.i18nMethods.includes(methodName)) {
    return ''
  }

  // Not a declared variable, not a global/library method - return empty string
  return ''
}
