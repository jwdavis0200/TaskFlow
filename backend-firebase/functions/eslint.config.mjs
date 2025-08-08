import js from '@eslint/js'
import globals from 'globals'
import pluginN from 'eslint-plugin-n'
import pluginPromise from 'eslint-plugin-promise'

// ESLint flat config for Firebase Functions (Node.js, CommonJS)
export default [
  { ignores: ['node_modules/**', 'dist/**', 'lib/**', 'eslint.config.*'] },
  // Base recommended JS rules
  js.configs.recommended,
  // Node plugin recommended rules (flat config variant)
  pluginN.configs['flat/recommended'],
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node }
    },
    plugins: {
      n: pluginN,
      promise: pluginPromise
    },
    rules: {
      // Cloud Functions logs are expected for observability
      'no-console': 'off',

      // Safer defaults
      'no-undef': 'error',
      eqeqeq: ['error', 'smart'],
      'no-return-await': 'error',

      // Node best practices (tuned for functions runtime)
      'n/no-process-exit': 'off',
      'n/no-unsupported-features/node-builtins': 'off',

      // Promise best practices
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/catch-or-return': ['error', { allowFinally: true }],
      'promise/no-new-statics': 'error',
      'promise/no-return-in-finally': 'error',
      'promise/valid-params': 'error',
      'promise/prefer-await-to-then': 'warn',

      // Allow intentionally unused vars/args when prefixed with _; do not flag unused caught errors
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none'
      }]
    }
  }
]


