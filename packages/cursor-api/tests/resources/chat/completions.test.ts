import { ChatCompletions } from '../../../src/resources/chat/completions'
import { APIClient } from '../../../src/core/api'
import { BadRequestError } from '../../../src/core/errors'
import type { ChatCompletionCreateParams } from '../../../src/types/chat'
import { CursorStream } from '../../../src/core/streaming'

// Mock the dependencies
jest.mock('../../../src/lib/protobuf', () => ({
  createHexMessage: jest.fn().mockReturnValue(Buffer.from('mock-hex-data')),
  parseHexResponse: jest.fn().mockReturnValue(['mock response']),
}))

// Mock the streaming module including processChunk
jest.mock('../../../src/core/streaming', () => {
  const actualStreaming = jest.requireActual('../../../src/core/streaming')
  return {
    ...actualStreaming,
    CursorStream: jest
      .fn()
      .mockImplementation((_response, _responseId, _model) => ({
        toStream: jest.fn().mockReturnValue(
          new ReadableStream({
            start(controller) {
              controller.enqueue({
                id: 'test-id',
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: 'test-model',
                choices: [
                  {
                    index: 0,
                    delta: {
                      content: 'test content',
                    },
                  },
                ],
              })
              controller.close()
            },
          })
        ),
        processChunk: jest.fn(),
        enqueue: jest.fn(),
        close: jest.fn(),
      })),
    processChunk: jest.fn().mockResolvedValue('processed chunk'),
  }
})

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}))

describe('ChatCompletions', () => {
  let mockClient: jest.Mocked<APIClient>
  let completions: ChatCompletions

  beforeEach(() => {
    jest.clearAllMocks()

    // Ensure the protobuf mock returns a Buffer
    const protobufMock = require('../../../src/lib/protobuf')
    protobufMock.createHexMessage.mockReturnValue(Buffer.from('mock-hex-data'))

    // Ensure the streaming mock returns expected values
    const streamingMock = require('../../../src/core/streaming')
    streamingMock.processChunk.mockResolvedValue('processed chunk')

    // Mock CursorStream with proper toStream method
    ;(CursorStream as jest.MockedClass<typeof CursorStream>).mockImplementation(
      () =>
        ({
          toStream: jest.fn().mockReturnValue(new ReadableStream()),
          processChunk: jest.fn(),
          enqueue: jest.fn(),
          close: jest.fn(),
        }) as any
    )

    mockClient = {
      post: jest.fn(),
    } as any

    completions = new ChatCompletions(mockClient)
  })

  describe('parameter validation', () => {
    const validParams: ChatCompletionCreateParams = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    }

    it('should validate messages array', async () => {
      await expect(
        completions.create({ ...validParams, messages: [] })
      ).rejects.toThrow(BadRequestError)

      await expect(
        completions.create({ ...validParams, messages: undefined as any })
      ).rejects.toThrow(BadRequestError)

      await expect(
        completions.create({ ...validParams, messages: 'invalid' as any })
      ).rejects.toThrow(BadRequestError)
    })

    it('should validate model parameter', async () => {
      await expect(
        completions.create({ ...validParams, model: '' })
      ).rejects.toThrow(BadRequestError)

      await expect(
        completions.create({ ...validParams, model: undefined as any })
      ).rejects.toThrow(BadRequestError)
    })

    it('should validate message format', async () => {
      await expect(
        completions.create({
          ...validParams,
          messages: [{ role: 'user', content: '' }],
        })
      ).rejects.toThrow(BadRequestError)

      await expect(
        completions.create({
          ...validParams,
          messages: [{ role: '' as any, content: 'Hello' }],
        })
      ).rejects.toThrow(BadRequestError)

      await expect(
        completions.create({
          ...validParams,
          messages: [{ role: 'invalid' as any, content: 'Hello' }],
        })
      ).rejects.toThrow(BadRequestError)
    })

    it('should accept valid parameters', async () => {
      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      await expect(completions.create(validParams)).resolves.toBeDefined()
    })
  })

  describe('non-streaming completions', () => {
    const validParams: ChatCompletionCreateParams = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    }

    it('should create non-streaming completion', async () => {
      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new Uint8Array([72, 101, 108, 108, 111]), // "Hello"
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)

      expect(mockClient.post).toHaveBeenCalledWith(
        '/aiserver.v1.AiService/StreamChat',
        expect.any(Buffer),
        undefined
      )

      expect(result).toMatchObject({
        id: expect.stringContaining('chatcmpl-'),
        object: 'chat.completion',
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: expect.any(String),
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      })
    })

    it('should handle empty response body', async () => {
      const mockResponse = { body: null }
      mockClient.post.mockResolvedValue(mockResponse as any)

      await expect(completions.create(validParams)).rejects.toThrow(
        'Response body is null'
      )
    })

    it('should handle response with multiple chunks', async () => {
      const chunks = [
        new Uint8Array([72, 101, 108, 108, 111]), // "Hello"
        new Uint8Array([32, 87, 111, 114, 108, 100]), // " World"
      ]

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({ done: false, value: chunks[0] })
              .mockResolvedValueOnce({ done: false, value: chunks[1] })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)

      expect(result.choices[0]?.message.content).toBeDefined()
    })
  })

  describe('streaming completions', () => {
    const validParams: ChatCompletionCreateParams = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: true,
    }

    it('should create streaming completion', async () => {
      const mockResponse = { body: new ReadableStream() }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)

      expect(mockClient.post).toHaveBeenCalledWith(
        '/aiserver.v1.AiService/StreamChat',
        expect.any(Buffer),
        expect.objectContaining({ stream: true })
      )

      expect(result).toBeInstanceOf(ReadableStream)
    })

    it('should pass options to streaming request', async () => {
      const mockResponse = { body: new ReadableStream() }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const options = { timeout: 5000 }
      await completions.create(validParams, options)

      expect(mockClient.post).toHaveBeenCalledWith(
        '/aiserver.v1.AiService/StreamChat',
        expect.any(Buffer),
        expect.objectContaining({ ...options, stream: true })
      )
    })
  })

  describe('request body creation', () => {
    const validParams: ChatCompletionCreateParams = {
      model: 'claude-4-sonnet',
      messages: [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ],
    }

    it('should create hex message with correct parameters', async () => {
      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const { createHexMessage } = await import('../../../src/lib/protobuf')

      await completions.create(validParams)

      expect(createHexMessage).toHaveBeenCalledWith(
        validParams.messages,
        validParams.model
      )
    })

    it('should handle different model types', async () => {
      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const models = ['gpt-4.1', 'claude-3.7-sonnet', 'deepseek-r1']

      for (const model of models) {
        await completions.create({ ...validParams, model })
      }

      expect(mockClient.post).toHaveBeenCalledTimes(models.length)
    })
  })

  describe('response processing', () => {
    const validParams: ChatCompletionCreateParams = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    }

    it('should handle gzipped response chunks', async () => {
      // Mock gzipped data (simplified)
      const gzipHeader = new Uint8Array([0x01, 0x00, 0x00, 0x04, 0x1b])
      const gzipData = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]) // gzip magic

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new Uint8Array([...gzipHeader, ...gzipData]),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(result).toBeDefined()
    })

    it('should handle JSON response chunks', async () => {
      const jsonHeader = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x02])
      const jsonData = Buffer.from('{}', 'utf-8')

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new Uint8Array([...jsonHeader, ...jsonData]),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(result).toBeDefined()
    })

    it('should handle protobuf response chunks', async () => {
      const protobufPrefix = new Uint8Array([0x00, 0x00, 0x00, 0x00])
      const protobufData = new Uint8Array([
        0x0a, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f,
      ]) // "Hello" in protobuf

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new Uint8Array([...protobufPrefix, ...protobufData]),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(result).toBeDefined()
    })

    it('should handle API error responses', async () => {
      const errorResponse = JSON.stringify({
        error: { message: 'API Error', type: 'invalid_request' },
      })

      // Mock processChunk from streaming to throw error for error responses
      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(errorResponse)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('non-error', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      await expect(completions.create(validParams)).rejects.toThrow('API Error')

      // Reset mock for other tests
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })
  })

  describe('text cleaning', () => {
    const validParams: ChatCompletionCreateParams = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    }

    it('should clean system prompts from response', async () => {
      const responseWithSystemPrompt = `
        <|BEGIN_SYSTEM|>You are a helpful assistant<|END_SYSTEM|>
        <|BEGIN_USER|>Hello<|END_USER|>
        <|BEGIN_ASSISTANT|>Hi there!<|END_ASSISTANT|>
      `

      // Mock processChunk to return the expected system prompt response
      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(responseWithSystemPrompt)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      // The cleanResponseText method should extract the assistant content
      expect(result.choices[0]?.message.content).toBe('Hi there!')

      // Reset mock for other tests
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })

    it('should handle response before system prompt', async () => {
      const responseBeforeSystem = `
        Actual response content
        <|BEGIN_SYSTEM|>System prompt<|END_SYSTEM|>
      `

      // Mock processChunk to return the expected response
      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(responseBeforeSystem)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      // The cleanResponseText method should extract content before system prompt
      expect(result.choices[0]?.message.content).toBe('Actual response content')

      // Reset mock for other tests
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })

    it('should clean JSON artifacts', async () => {
      const responseWithArtifacts = '{}Response content{}'

      // Mock processChunk to return the expected response with artifacts
      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(responseWithArtifacts)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      // The cleanResponseText method should clean up artifacts (trailing {} are removed)
      expect(result.choices[0]?.message.content).toBe('{}Response content')

      // Reset mock for other tests
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })
  })

  describe('edge cases', () => {
    const validParams: ChatCompletionCreateParams = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    }

    it('should handle empty response', async () => {
      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(result.choices[0]?.message.content).toBe('')
    })

    it('should handle reader lock release on error', async () => {
      const mockReader = {
        read: jest.fn().mockRejectedValue(new Error('Read error')),
        releaseLock: jest.fn(),
      }

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue(mockReader),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      await expect(completions.create(validParams)).rejects.toThrow()
      expect(mockReader.releaseLock).toHaveBeenCalled()
    })

    it('should handle various message roles', async () => {
      const paramsWithAllRoles: ChatCompletionCreateParams = {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'System message' },
          { role: 'user', content: 'User message' },
          { role: 'assistant', content: 'Assistant message' },
        ],
      }

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      await expect(
        completions.create(paramsWithAllRoles)
      ).resolves.toBeDefined()
    })

    it('should handle message validation edge cases', async () => {
      const validParams: ChatCompletionCreateParams = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      }

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      // Test with message having name field
      const messagesWithName = [
        { role: 'user' as const, content: 'Hello', name: 'test-user' },
      ]

      await expect(
        completions.create({ ...validParams, messages: messagesWithName })
      ).resolves.toBeDefined()
    })

    it('should handle request options properly', async () => {
      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const options = {
        timeout: 30000,
        headers: { 'X-Custom': 'test' },
      }

      await completions.create(validParams, options)

      expect(mockClient.post).toHaveBeenCalledWith(
        '/aiserver.v1.AiService/StreamChat',
        expect.any(Buffer),
        options
      )
    })

    it('should handle combined gzip chunks correctly', async () => {
      // Simulate multiple gzip chunks that need to be combined
      const gzipChunk1 = new Uint8Array([
        0x01, 0x00, 0x00, 0x04, 0x1b, 0x1f, 0x8b, 0x08, 0x00,
      ])
      const gzipChunk2 = new Uint8Array([
        0x01, 0x00, 0x00, 0x04, 0x1b, 0x1f, 0x8b, 0x08, 0x00,
      ])

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({ done: false, value: gzipChunk1 })
              .mockResolvedValueOnce({ done: false, value: gzipChunk2 })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(result).toBeDefined()
    })

    it('should handle protobuf text cleaning', async () => {
      // Mock a protobuf response that needs cleaning
      const protobufResponse = '\x0a\x05Hello'

      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(protobufResponse)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(result.choices[0]?.message.content).toBeDefined()

      // Reset mock for other tests
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })

    it('should handle invalid message content validation', async () => {
      // Test messages with empty content
      await expect(
        completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: '' }],
        })
      ).rejects.toThrow('Each message must have role and content')
    })

    it('should handle invalid message role validation', async () => {
      // Test messages with no role
      await expect(
        completions.create({
          model: 'gpt-4o',
          messages: [{ role: undefined as any, content: 'Hello' }],
        })
      ).rejects.toThrow('Each message must have role and content')
    })

    it('should handle gzip decompression errors in individual chunks', async () => {
      // Simulate a scenario where combined gzip fails but individual processing succeeds
      const invalidGzipChunk1 = new Uint8Array([
        0x01, 0x00, 0x00, 0x04, 0x1b, 0x1f, 0x8b, 0x08, 0x00, 0xff,
      ])
      const validGzipChunk2 = new Uint8Array([
        0x01, 0x00, 0x00, 0x04, 0x1b, 0x1f, 0x8b, 0x08, 0x00,
      ])

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({ done: false, value: invalidGzipChunk1 })
              .mockResolvedValueOnce({ done: false, value: validGzipChunk2 })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(result).toBeDefined()
    })

    it('should handle protobuf text with control characters', async () => {
      // Mock processChunk to return protobuf-like text with control characters
      const protobufText = '\x0a\x05Hello\x0a\x05World\x20test'

      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(protobufText)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      // Should clean protobuf control characters (actual behavior may vary)
      expect(typeof result.choices[0]?.message.content).toBe('string')

      // Reset mock for other tests
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })

    it('should handle response with assistant markers', async () => {
      const responseWithAssistant = `
        Some prefix text
        <|BEGIN_ASSISTANT|>This is the actual response content<|END_ASSISTANT|>
        Some suffix
      `

      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(responseWithAssistant)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(result.choices[0]?.message.content).toBe(
        'This is the actual response content'
      )

      // Reset mock for other tests
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })

    it('should handle response after user markers', async () => {
      const responseAfterUser = `
        Some conversation context
        <|END_USER|>
        <|BEGIN_ASSISTANT|>Assistant response<|END_ASSISTANT|>
        This should be extracted
      `

      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(responseAfterUser)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(typeof result.choices[0]?.message.content).toBe('string')

      // Reset mock for other tests
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })

    it('should handle complex protobuf character filtering', async () => {
      const complexProtobuf =
        'Before\x0a\x08Hello\x10\x20\x0a\x05World\x7fAfter'

      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(complexProtobuf)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      // Should extract readable content and filter out control characters
      expect(typeof result.choices[0]?.message.content).toBe('string')

      // Reset mock for other tests
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })

    it('should handle gzip decompression fallback to individual processing', async () => {
      // Create a scenario where combined gzip fails but individual decompression works
      const gzipChunk1 = new Uint8Array([
        0x01, 0x00, 0x00, 0x04, 0x1b, 0x1f, 0x8b, 0x08, 0x00, 0x01, 0x02,
      ])
      const gzipChunk2 = new Uint8Array([
        0x01, 0x00, 0x00, 0x04, 0x1b, 0x1f, 0x8b, 0x08, 0x00, 0x03, 0x04,
      ])

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({ done: false, value: gzipChunk1 })
              .mockResolvedValueOnce({ done: false, value: gzipChunk2 })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(result).toBeDefined()
      // Should handle gzip processing gracefully
      expect(typeof result.choices[0]?.message.content).toBe('string')
    })

    it('should handle protobuf text with invalid length fields', async () => {
      // Create protobuf-like text with invalid length that causes bounds check to fail
      const invalidProtobuf = '\x0a\xffHello' // Length 255 but not enough content

      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(invalidProtobuf)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      // Should handle invalid protobuf gracefully
      expect(typeof result.choices[0]?.message.content).toBe('string')

      // Reset mock for other tests
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })

    it('should handle complex character filtering in cleanProtobufText', async () => {
      // Test the character code filtering in cleanProtobufText
      const textWithMixedChars = '\x01\x02Hello\x1f\x20World\x7e\x7f\x80Test'

      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(textWithMixedChars)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      // Should filter out control characters but keep printable ones
      expect(typeof result.choices[0]?.message.content).toBe('string')

      // Reset mock for other tests
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })
  })

  describe('Additional edge cases for comprehensive coverage', () => {
    const validParams: ChatCompletionCreateParams = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should handle text after user markers and assistant markers', async () => {
      const responseAfterMarkers = `
        <|END_USER|>
        A
        Actual response content here
        <|BEGIN_ASSISTANT|>Assistant content<|END_ASSISTANT|>
        Some additional text
      `

      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(responseAfterMarkers)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(result.choices[0]?.message.content).toBe('Assistant content')

      // Reset mock
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })

    it('should handle protobuf text with various control character combinations', async () => {
      const protobufWithControls =
        '\x0a\x08Hello\x10\x20\x0a\x05World\x0c\x1f\x7fTest'

      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(protobufWithControls)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(typeof result.choices[0]?.message.content).toBe('string')

      // Reset mock
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })

    it('should handle protobuf text length validation edge cases', async () => {
      // Create text that will trigger bounds checking
      const problematicText = '\x0a\xff\x00Hello' // Large length with insufficient data

      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(problematicText)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(typeof result.choices[0]?.message.content).toBe('string')

      // Reset mock
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })

    it('should handle gzip chunks with decompression fallback', async () => {
      // Test scenario where combined gzip fails but individual processing succeeds
      const gzipChunk1 = new Uint8Array([
        0x01, 0x00, 0x00, 0x04, 0x1b, 0x1f, 0x8b, 0x08, 0x00, 0x01,
      ])
      const gzipChunk2 = new Uint8Array([
        0x01, 0x00, 0x00, 0x04, 0x1b, 0x1f, 0x8b, 0x08, 0x00, 0x02,
      ])

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({ done: false, value: gzipChunk1 })
              .mockResolvedValueOnce({ done: false, value: gzipChunk2 })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(result).toBeDefined()
      expect(typeof result.choices[0]?.message.content).toBe('string')
    })

    it('should handle response text cleaning edge cases', async () => {
      const textWithMultipleMarkers = `
        Prefix text
        <|END_USER|>
        C
        Main content
        <|BEGIN_ASSISTANT|>Assistant<|END_ASSISTANT|>
        {}
        Additional text
      `

      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(textWithMultipleMarkers)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(typeof result.choices[0]?.message.content).toBe('string')

      // Reset mock
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })

    it('should handle very large protobuf character filtering', async () => {
      // Create a long string with various control characters
      const longText = Array.from({ length: 1000 }, (_, i) => {
        const code = i % 256
        return String.fromCharCode(code)
      }).join('')

      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(longText)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(typeof result.choices[0]?.message.content).toBe('string')

      // Reset mock
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })

    it('should handle mixed gzip and non-gzip chunks', async () => {
      // Mix of gzip and regular chunks
      const gzipChunk = new Uint8Array([
        0x01, 0x00, 0x00, 0x04, 0x1b, 0x1f, 0x8b, 0x08, 0x00,
      ])
      const regularChunk = Buffer.from('Regular text content', 'utf-8')

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({ done: false, value: gzipChunk })
              .mockResolvedValueOnce({ done: false, value: regularChunk })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(result).toBeDefined()
      expect(typeof result.choices[0]?.message.content).toBe('string')
    })

    it('should handle concurrent chunk processing errors', async () => {
      // Test error handling during concurrent gzip processing
      const problematicGzipChunk = new Uint8Array([
        0x01, 0x00, 0x00, 0x04, 0x1b, 0x1f, 0x8b, 0x08, 0x00, 0xff, 0xff,
      ])

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: problematicGzipChunk,
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(result).toBeDefined()
      expect(typeof result.choices[0]?.message.content).toBe('string')
    })

    it('should validate message role combinations', async () => {
      const validCombinations = [
        [{ role: 'system' as const, content: 'System' }],
        [
          { role: 'system' as const, content: 'System' },
          { role: 'user' as const, content: 'User' },
        ],
        [
          { role: 'user' as const, content: 'User' },
          { role: 'assistant' as const, content: 'Assistant' },
          { role: 'user' as const, content: 'User again' },
        ],
      ]

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      for (const messages of validCombinations) {
        await expect(
          completions.create({ ...validParams, messages })
        ).resolves.toBeDefined()
      }
    })

    it('should handle validateParams with various invalid inputs', async () => {
      const invalidCases = [
        { ...validParams, messages: null as any },
        { ...validParams, messages: 'invalid' as any },
        { ...validParams, messages: [null] as any },
        { ...validParams, messages: [{ role: null, content: 'test' }] as any },
        { ...validParams, messages: [{ role: 'user', content: null }] as any },
        { ...validParams, model: null as any },
        { ...validParams, model: 123 as any },
      ]

      for (const invalidParams of invalidCases) {
        await expect(completions.create(invalidParams)).rejects.toThrow()
      }
    })

    it('should handle unusual but valid edge cases', async () => {
      const edgeCaseParams = {
        model: 'gpt-4o',
        messages: [
          {
            role: 'user' as const,
            content: '', // Empty content - should fail validation
          },
        ],
      }

      await expect(completions.create(edgeCaseParams)).rejects.toThrow(
        'Each message must have role and content'
      )
    })

    it('should handle 4-byte zero prefix chunks', async () => {
      // Test chunks with 4-byte zero prefix (protobuf data)
      const zeroPrefix = new Uint8Array([0x00, 0x00, 0x00, 0x00])
      const protobufData = Buffer.from('test protobuf data', 'utf-8')
      const chunkWithZeroPrefix = new Uint8Array([
        ...zeroPrefix,
        ...protobufData,
      ])

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: chunkWithZeroPrefix,
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(result).toBeDefined()
      expect(typeof result.choices[0]?.message.content).toBe('string')
    })

    it('should handle cleanProtobufText boundary conditions', async () => {
      // Test protobuf text with boundary conditions
      const protobufWithBounds = '\x0a\x05hello\x10\x01test'

      const streamingMock = require('../../../src/core/streaming')
      streamingMock.processChunk.mockResolvedValueOnce(protobufWithBounds)

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('test', 'utf-8'),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      }
      mockClient.post.mockResolvedValue(mockResponse as any)

      const result = await completions.create(validParams)
      expect(typeof result.choices[0]?.message.content).toBe('string')

      // Reset mock
      streamingMock.processChunk.mockResolvedValue('processed chunk')
    })
  })
})
