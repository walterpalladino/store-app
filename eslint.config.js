import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'

export default [
  // Ignore build artifacts and vendored code.
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },

  // Base JS + React presets (flat config).
  js.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'], // new JSX transform — no `import React` needed
  reactRefresh.configs.vite,

  // Application source.
  {
    files: ['**/*.{js,jsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // react-hooks: catch the classes of bug this rollout is meant to prevent.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // This codebase is plain JS/MUI — prop-types are not used.
      'react/prop-types': 'off',
      // Allow intentionally-unused capitalized/underscore-prefixed identifiers.
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
    },
  },

  // Context modules intentionally co-locate the Provider component with its
  // hook (useX) and small helpers — Fast Refresh's component-only rule doesn't apply.
  {
    files: ['src/context/**/*.{js,jsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // Node-based config files.
  {
    files: ['*.config.js', 'vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Test files run under Vitest (jsdom) with `globals: true`.
  {
    files: ['src/test/**/*.{js,jsx}', '**/*.test.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },

  // Keep Prettier last so it disables any stylistic rules that would conflict.
  prettier,
]
