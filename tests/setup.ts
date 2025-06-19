/**
 * Jest setup file
 */

// Mock fetch globally for tests
global.fetch = jest.fn()

// Mock UUID for consistent test results
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}))

// Reset all mocks between tests
beforeEach(() => {
  jest.resetAllMocks()
})

// Clean up any remaining timers after each test
afterEach(() => {
  // Clear any Jest fake timers
  jest.clearAllTimers()
  // Use real timers to ensure cleanup
  jest.useRealTimers()
})

// Final cleanup after all tests
afterAll(async () => {
  // Give a small delay for any pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 100))
  // Final timer cleanup
  jest.clearAllTimers()
  jest.useRealTimers()
})

// Global test configuration
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock console methods to reduce test noise (optional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}
