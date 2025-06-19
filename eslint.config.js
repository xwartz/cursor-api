const typescriptParser = require('@typescript-eslint/parser')

module.exports = [
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'tests/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        // Node.js globals
        global: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        // Jest globals for test files
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      // Basic ESLint rules
      'no-unused-vars': 'off', // Handled by TypeScript
      'no-undef': 'off', // Handled by TypeScript
      'no-dupe-class-members': 'off', // Allow method overloads
      'no-constant-condition': ['error', { checkLoops: false }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'eslint.config.js'],
  },
]
