import sharedLint from '@bjj/eslint-config-shared'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
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
    ],
  }),
  // Fix: no-irregular-whitespace rule crashes on non-JS files in ESLint 9.x
  // Disable the rule for other file types (HTML, CSS, JSON, etc.)
  // Ref:
  // - https://github.com/eslint/json/issues/56
  // - https://github.com/eslint/eslint/issues/19255
  // - https://github.com/eslint/eslint/issues/19805
  // - https://github.com/eslint/eslint/issues/17167
  {
    files: [ '**/*.{html,css,scss,json,md}' ],
    rules: {
      'no-irregular-whitespace': 'off',
    },
  },
)
