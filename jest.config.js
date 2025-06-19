/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
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
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/examples/**/*',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/**/*.test.ts'],
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
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: 'e2e',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/e2e/**/*.e2e.test.ts'],
      testTimeout: 120000,
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
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  ],
};
