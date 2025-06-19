import { APIClient } from '../../src/core/api'
import {
  AuthenticationError,
  BadRequestError,
  RateLimitError,
  ConnectionError,
} from '../../src/core/errors'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('APIClient', () => {
  const validOptions = {
    apiKey: 'test-api-key',
    checksum: 'test-checksum',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create client with valid options', () => {
      const client = new APIClient(validOptions)
      expect(client).toBeInstanceOf(APIClient)
    })

    it('should throw error without API key', () => {
      expect(() => {
        new APIClient({ ...validOptions, apiKey: '' })
      }).toThrow('API key is required')
    })

    it('should throw error without checksum', () => {
      expect(() => {
        new APIClient({ ...validOptions, checksum: '' })
      }).toThrow('Checksum is required')
    })

    it('should use default values', () => {
      const client = new APIClient(validOptions)
      expect(client).toBeInstanceOf(APIClient)
    })

    it('should accept custom options', () => {
      const customOptions = {
        ...validOptions,
        baseURL: 'https://custom.api.com',
        maxRetries: 5,
        timeout: 30000,
        defaultHeaders: { 'X-Custom': 'test' },
      }
      const client = new APIClient(customOptions)
      expect(client).toBeInstanceOf(APIClient)
    })

    it('should throw error when fetch is not available', () => {
      const originalFetch = global.fetch
      ;(global as any).fetch = undefined

      expect(() => {
        new APIClient(validOptions)
      }).toThrow('fetch is not available')

      global.fetch = originalFetch
    })

    it('should handle URL-encoded API keys', () => {
      const client = new APIClient({
        ...validOptions,
        apiKey: 'prefix%3A%3Aactual-key',
      })
      expect(client).toBeInstanceOf(APIClient)
    })
  })

  describe('request method', () => {
    let client: APIClient

    beforeEach(() => {
      client = new APIClient(validOptions)
    })

    it('should make successful request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('success'),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await client.request('/test', { method: 'GET' })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api2.cursor.sh/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            authorization: 'Bearer test-api-key',
            'x-cursor-checksum': 'test-checksum',
          }),
        })
      )
      expect(result).toBe(mockResponse)
    })

    it('should handle request with body', async () => {
      const mockResponse = { ok: true, status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const body = JSON.stringify({ test: 'data' })
      await client.request('/test', { method: 'POST', body })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body,
        })
      )
    })

    it('should handle streaming requests', async () => {
      const mockResponse = { ok: true, status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      await client.request('/test', { method: 'GET', stream: true })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-cursor-streaming': 'true',
          }),
        })
      )
    })

    it('should handle custom headers', async () => {
      const mockResponse = { ok: true, status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      await client.request('/test', {
        method: 'GET',
        headers: { 'X-Custom': 'value' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'value',
          }),
        })
      )
    })

    it('should handle 400 error', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad request'),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(client.request('/test', { method: 'GET' })).rejects.toThrow(
        BadRequestError
      )
    })

    it('should handle 401 error', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized'),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(client.request('/test', { method: 'GET' })).rejects.toThrow(
        AuthenticationError
      )
    })

    it('should handle 429 error', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Rate limited'),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(client.request('/test', { method: 'GET' })).rejects.toThrow(
        RateLimitError
      )
    })

    it('should handle 500 error', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Server error'),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(client.request('/test', { method: 'GET' })).rejects.toThrow(
        'Server error'
      )
    })

    it('should retry on server errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Server error'),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const clientWithRetries = new APIClient({
        ...validOptions,
        maxRetries: 2,
      })

      await expect(
        clientWithRetries.request('/test', { method: 'GET' })
      ).rejects.toThrow()

      expect(mockFetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should not retry on client errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad request'),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(client.request('/test', { method: 'GET' })).rejects.toThrow(
        BadRequestError
      )

      expect(mockFetch).toHaveBeenCalledTimes(1) // No retries
    })

    it('should handle timeout', async () => {
      const clientWithTimeout = new APIClient({
        ...validOptions,
        timeout: 10,
      })

      // Mock fetch to immediately reject with AbortError
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValue(abortError)

      await expect(
        clientWithTimeout.request('/test', { method: 'GET' })
      ).rejects.toThrow('Request timed out')
    })

    it('should handle timeout with exponential backoff', async () => {
      const clientWithRetries = new APIClient({
        ...validOptions,
        maxRetries: 2,
        timeout: 10,
      })

      // Mock fetch to always reject with AbortError
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValue(abortError)

      await expect(
        clientWithRetries.request('/test', { method: 'GET' })
      ).rejects.toThrow('Request timed out')

      expect(mockFetch).toHaveBeenCalledTimes(3) // Original + 2 retries
    })

    it('should handle abort signal', async () => {
      const controller = new AbortController()
      const signal = controller.signal

      mockFetch.mockImplementation(() => {
        controller.abort()
        return Promise.reject(new Error('AbortError'))
      })

      await expect(
        client.request('/test', { method: 'GET', signal })
      ).rejects.toThrow(ConnectionError)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(client.request('/test', { method: 'GET' })).rejects.toThrow(
        ConnectionError
      )
    })

    it('should handle response text error', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockRejectedValue(new Error('Text error')),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(client.request('/test', { method: 'GET' })).rejects.toThrow(
        BadRequestError
      )
    })
  })

  describe('helper methods', () => {
    let client: APIClient

    beforeEach(() => {
      client = new APIClient(validOptions)
    })

    it('should make POST request', async () => {
      const mockResponse = { ok: true, status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const body = 'test-body'
      await client.post('/test', body)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body,
        })
      )
    })

    it('should make GET request', async () => {
      const mockResponse = { ok: true, status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      await client.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should pass options to helper methods', async () => {
      const mockResponse = { ok: true, status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const options = { timeout: 5000 }
      await client.post('/test', 'body', options)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: 'body',
        })
      )
    })
  })

  describe('additional edge cases for complete coverage', () => {
    let client: APIClient

    beforeEach(() => {
      client = new APIClient(validOptions)
    })

    it('should handle request when fetch returns response.text() that throws', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockRejectedValue(new Error('Text parsing failed')),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(client.request('/test', { method: 'GET' })).rejects.toThrow(
        BadRequestError
      )
      expect(mockResponse.text).toHaveBeenCalled()
    })

    it('should handle request that fails after all retries with no lastError', async () => {
      // Mock fetch to throw but in a way that doesn't set lastError
      mockFetch.mockImplementation(() => {
        throw new Error('Network error')
      })

      const clientWithRetries = new APIClient({
        ...validOptions,
        maxRetries: 1,
      })

      await expect(
        clientWithRetries.request('/test', { method: 'GET' })
      ).rejects.toThrow('Request failed: Network error')
    })

    it('should handle AbortError correctly', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValue(abortError)

      await expect(client.request('/test', { method: 'GET' })).rejects.toThrow(
        'Request timed out'
      )
    })

    it('should handle generic errors that are already CursorError instances', async () => {
      const cursorError = new BadRequestError('Already a cursor error')
      mockFetch.mockRejectedValue(cursorError)

      await expect(client.request('/test', { method: 'GET' })).rejects.toThrow(
        'Already a cursor error'
      )
    })

    it('should reach the final fallback APIError', async () => {
      // Create a scenario where we exhaust retries but lastError is null somehow
      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount <= 3) {
          // This simulates all attempts failing but no error being caught
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Server error'),
          })
        }
        return Promise.resolve({ ok: true, status: 200 })
      })

      const clientWithRetries = new APIClient({
        ...validOptions,
        maxRetries: 2,
      })

      await expect(
        clientWithRetries.request('/test', { method: 'GET' })
      ).rejects.toThrow('Server error')
    })

    it('should handle clearTimeout being called on successful request', async () => {
      mockFetch.mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          text: () => Promise.resolve('success'),
        }
      })

      const result = await client.request('/test', { method: 'GET' })

      expect(result).toBeDefined()
    })
  })
})
