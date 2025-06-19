/** @type {import('jest').Config} */

const commonTsJestConfig = {
  useESM: false,
  tsconfig: {
    module: 'commonjs',
    target: 'es2020',
    moduleResolution: 'node',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: false
  }
};

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'e2e',
  roots: ['<rootDir>'],
  testMatch: ['**/*.e2e.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', commonTsJestConfig],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/../tests/setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/temp-.*\\.(js|mjs|ts)$/'
  ],
  maxWorkers: 1,
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
};
