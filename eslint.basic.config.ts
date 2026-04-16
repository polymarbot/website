import sharedLint from '@polymarbot/eslint-config-shared'
import type { Linter } from 'eslint'

/** Minimal shape of Nuxt's config composer — only the method we actually use */
interface NuxtConfigComposer {
  toConfigs: () => Promise<Linter.Config[]>
}

/** Plugins provided by the shared config — strip from Nuxt to avoid duplicate instances */
const SHARED_PLUGINS = [
  '@typescript-eslint',
  'vue',
]

interface EslintConfigOptions {
  ignores?: string[]
}

export function generateEslintConfig (options: EslintConfigOptions = {}): Linter.Config[] {
  const { ignores: extraIgnores = []} = options

  return [
    ...sharedLint({
      scopes: {
        vue: true,
        tailwindcss: {
          settings: {
            entryPoint: 'app/assets/styles/globals.css',
          },
        },
        ts: {
          rules: {
            '@typescript-eslint/no-empty-object-type': 'off',
          },
        },
      },
      ignores: [
        '.nuxt',
        'dist',
        'tsconfig.json',
        '**/*.css',
        '**/*.scss',
        ...extraIgnores,
      ],
    }),
    // Fix: no-irregular-whitespace rule crashes on non-JS files in ESLint 9.x
    {
      files: [ '**/*.{html,css,scss,json,md}' ],
      rules: {
        'no-irregular-whitespace': 'off',
      },
    },
  ]
}

/**
 * Resolve Nuxt ESLint configs, strip conflicting plugin registrations,
 * and merge with shared config. Nuxt provides auto-import globals only;
 * plugins and rules come from the shared config.
 */
export async function generateNuxtEslintConfig (
  withNuxt: (...configs: Linter.Config[]) => NuxtConfigComposer,
  options?: EslintConfigOptions,
): Promise<Linter.Config[]> {
  const nuxtConfigs = await withNuxt().toConfigs()

  // Strip plugin registrations that the shared config already provides
  for (const config of nuxtConfigs) {
    if (!config.plugins) continue
    for (const name of SHARED_PLUGINS) {
      delete config.plugins[name]
    }
  }

  return [
    ...nuxtConfigs,
    ...generateEslintConfig(options),
  ]
}
