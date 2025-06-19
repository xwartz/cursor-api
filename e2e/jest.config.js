/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000,
  roots: ['<rootDir>'],
  testMatch: ['**/*.e2e.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        module: 'commonjs',
        target: 'es2020',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false
      }
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/../tests/setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/temp-.*\\.(js|mjs|ts)$/'
  ],
}
