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
