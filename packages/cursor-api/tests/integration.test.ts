import { Cursor } from '../src/client'
import { BadRequestError } from '../src/core/errors'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Integration Tests', () => {
  const validOptions = {
    apiKey: 'test-api-key',
    checksum: 'test-checksum',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('End-to-end client functionality', () => {
    it('should handle complete request flow with success', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('Hello from integration test'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockFetch.mockResolvedValue(mockResponse)

      const client = new Cursor(validOptions)
      const result = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      })

      expect(result).toBeDefined()
      expect(result.choices[0]?.message.content).toBeDefined()
    })

    it('should handle complete streaming flow', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('Stream chunk 1'),
              })
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('Stream chunk 2'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockFetch.mockResolvedValue(mockResponse)

      const client = new Cursor(validOptions)
      const stream = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      })

      expect(stream).toBeInstanceOf(ReadableStream)
    })

    it('should handle client creation with all options', () => {
      const fullOptions = {
        apiKey: 'test-key',
        checksum: 'test-checksum',
        baseURL: 'https://custom.api.url',
        maxRetries: 5,
        timeout: 30000,
        defaultHeaders: { 'X-Custom': 'test' },
        fetch: mockFetch,
      }

      const client = new Cursor(fullOptions)
      expect(client).toBeInstanceOf(Cursor)
      expect(client.chat.completions).toBeDefined()
    })

    it('should handle API errors properly throughout the stack', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized access'),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const client = new Cursor(validOptions)

      await expect(
        client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Unauthorized access')
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network connection failed'))

      const client = new Cursor(validOptions)

      await expect(
        client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow()
    })

    it('should handle validation errors before making requests', async () => {
      const client = new Cursor(validOptions)

      await expect(
        client.chat.completions.create({
          model: 'gpt-4o',
          messages: [], // Empty messages should fail validation
        })
      ).rejects.toThrow(BadRequestError)

      // Verify no network request was made
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle static create method', () => {
      const client = Cursor.create(validOptions)
      expect(client).toBeInstanceOf(Cursor)
      expect(client.chat.completions).toBeDefined()
    })

    it('should maintain request context through the stack', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockFetch.mockResolvedValue(mockResponse)

      const client = new Cursor(validOptions)

      const customHeaders = { 'X-Request-ID': 'test-123' }
      await client.chat.completions.create(
        {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        },
        { headers: customHeaders }
      )

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining(customHeaders),
        })
      )
    })
  })

  describe('Error propagation and handling', () => {
    it('should propagate custom errors correctly', async () => {
      const customError = new Error('Custom API error')
      customError.name = 'CustomError'
      mockFetch.mockRejectedValue(customError)

      const client = new Cursor(validOptions)

      await expect(
        client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Custom API error')
    })

    it('should handle timeout errors in the complete stack', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'AbortError'
      mockFetch.mockRejectedValue(timeoutError)

      const client = new Cursor(validOptions)

      await expect(
        client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Request timed out')
    })

    it('should handle malformed response data', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockRejectedValue(new Error('Stream read error')),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockFetch.mockResolvedValue(mockResponse)

      const client = new Cursor(validOptions)

      await expect(
        client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Stream read error')
    })
  })

  describe('Configuration and options handling', () => {
    it('should handle missing required configuration', () => {
      expect(() => {
        new Cursor({ apiKey: '', checksum: 'test' })
      }).toThrow('API key is required')

      expect(() => {
        new Cursor({ apiKey: 'test', checksum: '' })
      }).toThrow('Checksum is required')
    })

    it('should handle custom base URL configurations', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockFetch.mockResolvedValue(mockResponse)

      const customClient = new Cursor({
        ...validOptions,
        baseURL: 'https://custom.cursor.api',
      })

      await customClient.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://custom.cursor.api'),
        expect.any(Object)
      )
    })

    it('should handle retry configuration', async () => {
      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount <= 2) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Server error'),
          })
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: () => Promise.resolve({ done: true }),
              releaseLock: () => {},
            }),
          },
        })
      })

      const clientWithRetries = new Cursor({
        ...validOptions,
        maxRetries: 3,
      })

      const result = await clientWithRetries.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      })

      expect(callCount).toBe(3) // Initial + 2 retries
      expect(result).toBeDefined()
    })
  })

  describe('Type safety and validation integration', () => {
    it('should maintain type safety throughout the API', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockFetch.mockResolvedValue(mockResponse)

      const client = new Cursor(validOptions)

      // This should compile and work with proper types
      const result = await client.chat.completions.create({
        model: 'gpt-4o' as const,
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
      })

      expect(result.choices[0]?.message.role).toBe('assistant')
      expect(typeof result.choices[0]?.message.content).toBe('string')
    })

    it('should handle all supported model types', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockFetch.mockResolvedValue(mockResponse)

      const client = new Cursor(validOptions)
      const supportedModels = [
        'claude-4-sonnet',
        'claude-3.7-sonnet',
        'gpt-4o',
        'gpt-4o-mini',
        'deepseek-r1',
      ]

      for (const model of supportedModels) {
        await expect(
          client.chat.completions.create({
            model,
            messages: [{ role: 'user', content: 'Test' }],
          })
        ).resolves.toBeDefined()
      }
    })
  })
})
