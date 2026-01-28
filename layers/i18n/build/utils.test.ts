import { describe, it, expect } from 'vitest'
import {
  extractMessageKeys,
  extractNamespaceFromArgs,
  extractStringVariables,
  replaceVariables,
} from './utils'

describe('extractMessageKeys', () => {
  it('should extract keys from flat object', () => {
    const messages = {
      save: 'Save',
      cancel: 'Cancel',
    }

    const result = extractMessageKeys(messages)

    expect(result).toEqual([ 'save', 'cancel' ])
  })

  it('should extract keys from nested object', () => {
    const messages = {
      common: {
        actions: {
          save: 'Save',
          cancel: 'Cancel',
        },
      },
    }

    const result = extractMessageKeys(messages)

    expect(result).toEqual([ 'common.actions.save', 'common.actions.cancel' ])
  })

  it('should extract keys from deeply nested object', () => {
    const messages = {
      common: {
        actions: {
          save: 'Save',
        },
        labels: {
          email: 'Email',
        },
      },
      pages: {
        dashboard: {
          title: 'Dashboard',
        },
      },
    }

    const result = extractMessageKeys(messages)

    expect(result).toEqual([
      'common.actions.save',
      'common.labels.email',
      'pages.dashboard.title',
    ])
  })

  it('should handle empty object', () => {
    const messages = {}

    const result = extractMessageKeys(messages)

    expect(result).toEqual([])
  })

  it('should handle objects with null values', () => {
    const messages = {
      key1: null,
      key2: 'value',
    }

    const result = extractMessageKeys(messages)

    expect(result).toEqual([ 'key1', 'key2' ])
  })
})

describe('extractNamespaceFromArgs', () => {
  it('should extract string literal from single argument', () => {
    const stringVars = new Map<string, string>()

    const result = extractNamespaceFromArgs('\'common\'', stringVars)

    expect(result).toBe('common')
  })

  it('should extract string literal from multiple arguments', () => {
    const stringVars = new Map<string, string>()

    const result = extractNamespaceFromArgs('event, \'server.errors\'', stringVars)

    expect(result).toBe('server.errors')
  })

  it('should prioritize strings with dots over last string', () => {
    const stringVars = new Map<string, string>()

    const result = extractNamespaceFromArgs('\'simple\', \'has.dots\', \'last\'', stringVars)

    expect(result).toBe('has.dots')
  })

  it('should return last string literal if none have dots', () => {
    const stringVars = new Map<string, string>()

    const result = extractNamespaceFromArgs('\'first\', \'second\', \'last\'', stringVars)

    expect(result).toBe('last')
  })

  it('should handle variable references with string variable map', () => {
    const stringVars = new Map([[ 'ns', 'common.actions' ]])

    const result = extractNamespaceFromArgs('event, ns', stringVars)

    expect(result).toBe('common.actions')
  })

  it('should return last variable if multiple variables exist', () => {
    const stringVars = new Map([
      [ 'ns1', 'common' ],
      [ 'ns2', 'server.errors' ],
    ])

    const result = extractNamespaceFromArgs('event, ns1, ns2', stringVars)

    expect(result).toBe('server.errors')
  })

  it('should return empty string for unresolved variable', () => {
    const stringVars = new Map<string, string>()

    const result = extractNamespaceFromArgs('event', stringVars)

    expect(result).toBe('')
  })

  it('should return empty string for empty arguments', () => {
    const stringVars = new Map<string, string>()

    const result = extractNamespaceFromArgs('', stringVars)

    expect(result).toBe('')
  })

  it('should handle mixed string literals and variables (string takes priority)', () => {
    const stringVars = new Map([[ 'ns', 'common' ]])

    const result = extractNamespaceFromArgs('event, \'server.errors\', ns', stringVars)

    expect(result).toBe('server.errors')
  })

  it('should handle double quotes', () => {
    const stringVars = new Map<string, string>()

    const result = extractNamespaceFromArgs('event, "server.errors"', stringVars)

    expect(result).toBe('server.errors')
  })

  it('should handle backticks', () => {
    const stringVars = new Map<string, string>()

    const result = extractNamespaceFromArgs('event, `server.errors`', stringVars)

    expect(result).toBe('server.errors')
  })

  it('should handle whitespace around arguments', () => {
    const stringVars = new Map<string, string>()

    const result = extractNamespaceFromArgs('  event  ,  \'server.errors\'  ', stringVars)

    expect(result).toBe('server.errors')
  })

  it('should handle complex function arguments with options', () => {
    const stringVars = new Map<string, string>()

    const result = extractNamespaceFromArgs('event, \'namespace\', options', stringVars)

    expect(result).toBe('namespace')
  })

  it('should extract namespace with parentheses (route groups)', () => {
    const stringVars = new Map<string, string>()

    const result = extractNamespaceFromArgs('\'pages.(homepage)\'', stringVars)

    expect(result).toBe('pages.(homepage)')
  })

  it('should extract namespace with multiple parentheses groups', () => {
    const stringVars = new Map<string, string>()

    const result = extractNamespaceFromArgs('event, \'pages.(admin).(dashboard)\'', stringVars)

    expect(result).toBe('pages.(admin).(dashboard)')
  })

  it('should handle parentheses in namespace with double quotes', () => {
    const stringVars = new Map<string, string>()

    const result = extractNamespaceFromArgs('event, "pages.(homepage)"', stringVars)

    expect(result).toBe('pages.(homepage)')
  })

  it('should handle parentheses in namespace with backticks', () => {
    const stringVars = new Map<string, string>()

    const result = extractNamespaceFromArgs('event, `pages.(homepage)`', stringVars)

    expect(result).toBe('pages.(homepage)')
  })
})

describe('extractStringVariables', () => {
  it('should extract string variables', () => {
    const content = `
      const ns = 'pages.dashboard'
      const namespace = 'common'
    `

    const result = extractStringVariables(content)

    expect(result.get('ns')).toBe('pages.dashboard')
    expect(result.get('namespace')).toBe('common')
  })

  it('should extract variables with different quote types', () => {
    const content = `
      const ns1 = 'pages.dashboard'
      const ns2 = "common.actions"
      const ns3 = \`app.settings\`
    `

    const result = extractStringVariables(content)

    expect(result.get('ns1')).toBe('pages.dashboard')
    expect(result.get('ns2')).toBe('common.actions')
    expect(result.get('ns3')).toBe('app.settings')
  })

  it('should handle single-word values', () => {
    const content = `
      const ns = 'common'
      const message = 'hello'
    `

    const result = extractStringVariables(content)

    expect(result.get('ns')).toBe('common')
    expect(result.get('message')).toBe('hello')
  })

  it('should ignore non-identifier string values', () => {
    const content = `
      const message = 'hello world'
      const count = '123'
      const ns = 'pages.dashboard'
    `

    const result = extractStringVariables(content)

    expect(result.has('message')).toBe(false)
    expect(result.has('count')).toBe(false)
    expect(result.get('ns')).toBe('pages.dashboard')
  })

  it('should handle multiple variables on separate lines', () => {
    const content = `
      const ns1 = 'pages.home'
      const otherVar = 'not namespace'
      const ns2 = 'pages.dashboard'
    `

    const result = extractStringVariables(content)

    expect(result.get('ns1')).toBe('pages.home')
    expect(result.get('ns2')).toBe('pages.dashboard')
    expect(result.has('otherVar')).toBe(false)
  })

  it('should return empty map for content without valid variables', () => {
    const content = `
      const message = 'hello world'
      function test() {}
    `

    const result = extractStringVariables(content)

    expect(result.size).toBe(0)
  })
})

describe('replaceVariables', () => {
  it('should replace single variable', () => {
    const variables = new Map([[ 'ns', 'pages.dashboard' ]])

    const result = replaceVariables('${ns}.name', variables)

    expect(result).toBe('pages.dashboard.name')
  })

  it('should replace variable and keep unknown variables', () => {
    const variables = new Map([[ 'ns', 'pages.dashboard' ]])

    const result = replaceVariables('${ns}.status.${status}', variables)

    expect(result).toBe('pages.dashboard.status.${status}')
  })

  it('should replace multiple variables', () => {
    const variables = new Map([
      [ 'ns', 'pages.dashboard' ],
      [ 'action', 'common.actions' ],
    ])

    const result = replaceVariables('${ns}.${action}', variables)

    expect(result).toBe('pages.dashboard.common.actions')
  })

  it('should not replace unknown variables', () => {
    const variables = new Map([[ 'ns', 'pages.dashboard' ]])

    const result = replaceVariables('${unknown}.name', variables)

    expect(result).toBe('${unknown}.name')
  })

  it('should handle static keys without variables', () => {
    const variables = new Map([[ 'ns', 'pages.dashboard' ]])

    const result = replaceVariables('static.key.path', variables)

    expect(result).toBe('static.key.path')
  })

  it('should handle keys with mixed static and dynamic parts', () => {
    const variables = new Map([[ 'ns', 'pages.dashboard' ]])

    const result = replaceVariables('prefix.${ns}.suffix.${var}', variables)

    expect(result).toBe('prefix.pages.dashboard.suffix.${var}')
  })

  it('should handle empty variables map', () => {
    const variables = new Map<string, string>()

    const result = replaceVariables('${ns}.name', variables)

    expect(result).toBe('${ns}.name')
  })
})
