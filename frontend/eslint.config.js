import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  // Ignore build output
  { ignores: ['dist'] },

  // Base JS recommended rules
  js.configs.recommended,

  // Project rules for JS/JSX
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React recommended (includes jsx-uses-vars to fix unused styled components/icons used in JSX)
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // React 17+ JSX transform doesn't require React in scope
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // We are not using PropTypes in this project
      'react/prop-types': 'off',
      // JSX text content escaping is not critical for this project
      'react/no-unescaped-entities': 'off',
      // Allow underscore-prefixed unused vars/args for placeholders
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // Service worker globals for src/sw.js
  {
    files: ['src/sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        clients: 'readonly',
      },
    },
  },
]
