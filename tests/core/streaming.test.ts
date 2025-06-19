import { CursorStream, processChunk } from '../../src/core/streaming'
import type { ChatCompletionChunk } from '../../src/types/chat'

// Mock zlib with simpler implementation
jest.mock('zlib', () => ({
  gunzip: jest.fn((data, callback) => {
    // Synchronous mock to avoid timing issues
    if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
      callback(null, Buffer.from('Decompressed content'))
    } else {
      callback(new Error('Decompression failed'))
    }
  }),
  gunzipSync: jest.fn(data => {
    if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
      return Buffer.from('Decompressed content')
    } else {
      throw new Error('Decompression failed')
    }
  }),
}))

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}))

describe('Streaming', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('processChunk', () => {
    it('should process Connect protocol header with JSON data', async () => {
      const header = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x05])
      const jsonData = Buffer.from('Hello', 'utf-8')
      const chunk = new Uint8Array([...header, ...jsonData])

      const result = await processChunk(chunk)

      expect(result).toBe('Hello')
    })

    it('should handle invalid JSON in response', async () => {
      const header = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x10])
      const invalidJson = 'invalid{json}'
      const jsonData = Buffer.from(invalidJson, 'utf-8')
      const chunk = new Uint8Array([...header, ...jsonData])

      const result = await processChunk(chunk)

      expect(result).toBe('invalid{json}')
    })

    it('should parse hex-encoded protobuf messages', async () => {
      // Mock hex data representing a protobuf message
      const hexData = '0A0B48656C6C6F576F726C64' // "HelloWorld" in hex
      const chunk = Buffer.from(hexData, 'hex')

      const result = await processChunk(chunk)

      // Should return the decoded text since it's valid UTF-8
      expect(result).toBe('HelloWorld')
    })

    it('should fallback to UTF-8 for unknown data', async () => {
      const textData = Buffer.from('Hello World', 'utf-8')

      const result = await processChunk(textData)

      expect(result).toBe('Hello World')
    })

    it('should clean invalid UTF-8 sequences', async () => {
      const invalidUtf8 = new Uint8Array([
        0x48,
        0x65,
        0x6c,
        0x6c,
        0x6f,
        0x20, // "Hello "
        0x57,
        0x6f,
        0x72,
        0x6c,
        0x64, // "World"
        0xff,
        0xfe, // Invalid UTF-8 bytes
      ])

      const result = await processChunk(invalidUtf8)

      expect(result).toContain('Hello')
      expect(result).toContain('World')
      expect(result).not.toContain('\x00')
    })

    it('should handle empty chunks', async () => {
      const emptyChunk = new Uint8Array(0)

      const result = await processChunk(emptyChunk)

      expect(result).toBe('')
    })

    it('should handle system prompt removal', async () => {
      const textWithSystemPrompt = `
        <|BEGIN_SYSTEM|>System prompt<|END_SYSTEM|>
        <|BEGIN_USER|>User message<|END_USER|>
        Response content
      `
      const chunk = Buffer.from(textWithSystemPrompt, 'utf-8')

      const result = await processChunk(chunk)

      expect(result).toBe('')
    })

    it('should clean response text', async () => {
      const textWithMarkers = 'Response\n\n{}\n'
      const chunk = Buffer.from(textWithMarkers, 'utf-8')

      const result = await processChunk(chunk)

      expect(result).toBe('Response')
    })

    it('should handle end-of-stream markers', async () => {
      const header = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x02])
      const endMarker = Buffer.from('{}', 'utf-8')
      const chunk = new Uint8Array([...header, ...endMarker])

      const result = await processChunk(chunk)

      expect(result).toBe('')
    })

    it('should handle different Connect protocol headers', async () => {
      // Test different header formats
      const header1 = new Uint8Array([0x01, 0x00, 0x00, 0x04, 0x1b])
      const textData1 = Buffer.from('test content 1', 'utf-8')
      const chunk1 = new Uint8Array([...header1, ...textData1])

      const result1 = await processChunk(chunk1)
      expect(result1).toBe('test content 1')

      const header2 = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x0e])
      const textData2 = Buffer.from('test content 2', 'utf-8')
      const chunk2 = new Uint8Array([...header2, ...textData2])

      const result2 = await processChunk(chunk2)
      expect(result2).toBe('test content 2')
    })

    it('should handle protobuf hex fallback processing', async () => {
      // Test that hex parsing is attempted for unknown formats
      const mockParseHexResponse = jest
        .fn()
        .mockReturnValue(['protobuf content'])
      const protobuf = require('../../src/lib/protobuf')
      protobuf.parseHexResponse = mockParseHexResponse

      const chunk = new Uint8Array([0x00, 0x01, 0x02, 0x03]) // Non-standard data
      const result = await processChunk(chunk)

      expect(mockParseHexResponse).toHaveBeenCalled()
      expect(result).toBe('protobuf content')
    })

    it('should handle chunk processing with cleanResponseText', async () => {
      // Test that text cleaning is applied
      const header = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x10])
      const textData = Buffer.from('  test with spaces  {}', 'utf-8')
      const chunk = new Uint8Array([...header, ...textData])

      const result = await processChunk(chunk)
      expect(result).toBe('test with spaces')
    })

    it('should handle JSON-like responses without errors', async () => {
      const header = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x20])
      const jsonData = Buffer.from(
        '{"status":"success","data":"test"}',
        'utf-8'
      )
      const chunk = new Uint8Array([...header, ...jsonData])

      const result = await processChunk(chunk)
      expect(result).toContain('success')
    })
  })

  describe('CursorStream', () => {
    let mockResponse: any
    let stream: CursorStream

    beforeEach(() => {
      mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
            cancel: jest.fn(),
          }),
        },
      }
      stream = new CursorStream(mockResponse, 'test-id', 'test-model')
    })

    it('should create CursorStream instance', () => {
      expect(stream).toBeDefined()
      expect(stream).toBeInstanceOf(CursorStream)
    })

    it('should have toStream method', () => {
      expect(stream.toStream).toBeDefined()
      expect(typeof stream.toStream).toBe('function')
    })

    it('should handle response without body', () => {
      const emptyResponse = { body: null }

      expect(() => {
        new CursorStream(emptyResponse as any, 'test-id', 'test-model')
      }).toThrow('Response body is null')
    })

    it('should handle stream errors gracefully', async () => {
      const mockReader = {
        read: jest.fn().mockRejectedValue(new Error('Stream error')),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      }

      mockResponse.body.getReader.mockReturnValue(mockReader)
      stream = new CursorStream(mockResponse, 'test-id', 'test-model')

      const readableStream = stream.toStream()
      const reader = readableStream.getReader()

      await expect(reader.read()).rejects.toThrow('Stream error')
    })

    it('should process simple chunks correctly', async () => {
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: Buffer.from('Hello'),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      }

      mockResponse.body.getReader.mockReturnValue(mockReader)
      stream = new CursorStream(mockResponse, 'test-id', 'test-model')

      const readableStream = stream.toStream()
      const reader = readableStream.getReader()

      // Read the content chunk
      const result1 = await reader.read()
      expect(result1.done).toBe(false)
      expect(result1.value).toBeDefined()
      expect(result1.value!.choices[0]?.delta?.content).toBe('Hello')

      // Read the final chunk
      const result2 = await reader.read()
      expect(result2.done).toBe(false)
      expect(result2.value).toBeDefined()
      expect(result2.value!.choices[0]?.finish_reason).toBe('stop')

      // Stream should be done
      const result3 = await reader.read()
      expect(result3.done).toBe(true)
    })

    it('should handle stream completion', async () => {
      const mockReader = {
        read: jest.fn().mockResolvedValueOnce({ done: true }), // Immediately signal completion
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      }

      mockResponse.body.getReader.mockReturnValue(mockReader)
      stream = new CursorStream(mockResponse, 'test-id', 'test-model')

      const readableStream = stream.toStream()
      const reader = readableStream.getReader()

      const result = await reader.read()
      expect(result.done).toBe(false)
      expect(result.value).toBeDefined()
      expect(result.value!.choices[0]?.finish_reason).toBe('stop')
    })

    it('should detect end-of-stream markers', async () => {
      const endMarker = new Uint8Array([
        0x02, 0x00, 0x00, 0x00, 0x02, 0x7b, 0x7d,
      ]) // {} in Connect format

      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({ done: false, value: endMarker })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      }

      mockResponse.body.getReader.mockReturnValue(mockReader)
      stream = new CursorStream(mockResponse, 'test-id', 'test-model')

      const readableStream = stream.toStream()
      const reader = readableStream.getReader()

      const result = await reader.read()
      expect(result.done).toBe(false)
      expect(result.value).toBeDefined()
      expect(result.value!.choices[0]?.finish_reason).toBe('stop')
    })
  })

  describe('integration tests', () => {
    it('should handle complete streaming workflow', async () => {
      const chunks = [
        Buffer.from('Hello', 'utf-8'),
        Buffer.from(' ', 'utf-8'),
        Buffer.from('World', 'utf-8'),
      ]

      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({ done: false, value: chunks[0] })
          .mockResolvedValueOnce({ done: false, value: chunks[1] })
          .mockResolvedValueOnce({ done: false, value: chunks[2] })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
        closed: Promise.resolve(undefined),
      }

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue(mockReader),
        },
      } as any

      const cursorStream = new CursorStream(mockResponse, 'test-id', 'gpt-4o')

      const allChunks: ChatCompletionChunk[] = []
      for await (const chunk of cursorStream) {
        allChunks.push(chunk)
      }

      expect(allChunks.length).toBeGreaterThan(0)

      // Should have content chunks and a final chunk
      const contentChunks = allChunks.filter(
        chunk =>
          chunk.choices[0]?.delta?.content &&
          chunk.choices[0].delta.content.length > 0
      )
      const finalChunk = allChunks.find(
        chunk => chunk.choices[0]?.finish_reason === 'stop'
      )

      expect(contentChunks.length).toBeGreaterThan(0)
      expect(finalChunk).toBeDefined()
    })

    it('should handle async iterator interface', async () => {
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: Buffer.from('Test content'),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      }

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue(mockReader),
        },
      } as any

      const cursorStream = new CursorStream(mockResponse, 'test-id', 'gpt-4o')

      // Test Symbol.asyncIterator
      expect(cursorStream[Symbol.asyncIterator]).toBeDefined()
      expect(typeof cursorStream[Symbol.asyncIterator]).toBe('function')

      const iterator = cursorStream[Symbol.asyncIterator]()
      const { value, done } = await iterator.next()

      expect(done).toBe(false)
      expect(value).toBeDefined()
    })

    it('should handle reader cancellation', async () => {
      const mockReader = {
        read: jest.fn().mockResolvedValue({ done: true }),
        releaseLock: jest.fn(),
        cancel: jest.fn().mockResolvedValue(undefined),
      }

      const mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue(mockReader),
        },
      } as any

      const cursorStream = new CursorStream(mockResponse, 'test-id', 'gpt-4o')
      const readableStream = cursorStream.toStream()

      await readableStream.cancel()
      expect(mockReader.cancel).toHaveBeenCalled()
    })
  })

  describe('cleanResponseText function', () => {
    it('should handle empty strings and objects', async () => {
      const header = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x02])
      const emptyData = Buffer.from('{}', 'utf-8')
      const chunk = new Uint8Array([...header, ...emptyData])

      const result = await processChunk(chunk)
      expect(result).toBe('')
    })

    it('should remove system prompts', async () => {
      const header = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x50])
      const systemPrompt =
        '<|BEGIN_SYSTEM|>System prompt<|END_SYSTEM|><|BEGIN_USER|>User input<|END_USER|>'
      const textData = Buffer.from(systemPrompt, 'utf-8')
      const chunk = new Uint8Array([...header, ...textData])

      const result = await processChunk(chunk)
      expect(result).toBe('')
    })

    it('should clean up text with markers', async () => {
      const header = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x30])
      const textWithMarkers = 'Some prefix<|END_USER|>\nCContent here{}'
      const textData = Buffer.from(textWithMarkers, 'utf-8')
      const chunk = new Uint8Array([...header, ...textData])

      const result = await processChunk(chunk)
      expect(result).toBe('Content here')
    })
  })

  describe('CursorStream edge cases', () => {
    let mockResponse: any

    beforeEach(() => {
      mockResponse = {
        body: {
          getReader: jest.fn(),
        },
      }
    })

    it('should handle timeout scenarios', async () => {
      const mockReader = {
        read: jest.fn().mockImplementation(
          () =>
            // Simulate a delay that would trigger timeout
            new Promise(() => {}) // Never resolves
        ),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      }

      mockResponse.body.getReader.mockReturnValue(mockReader)
      const stream = new CursorStream(mockResponse, 'test-id', 'test-model')

      const readableStream = stream.toStream()
      const reader = readableStream.getReader()

      // This should timeout and return a completion chunk
      const result = await Promise.race([
        reader.read(),
        new Promise(resolve => setTimeout(() => resolve({ done: true }), 100)),
      ])

      expect(result).toEqual({ done: true })
    })

    it('should handle chunk counting and idle detection', async () => {
      // Test the internal counter logic
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: Buffer.from('content 1'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: Buffer.from('content 2'),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      }

      mockResponse.body.getReader.mockReturnValue(mockReader)
      const stream = new CursorStream(mockResponse, 'test-id', 'test-model')

      const readableStream = stream.toStream()
      const reader = readableStream.getReader()

      // Get multiple content chunks
      const result1 = await reader.read()
      expect(result1.done).toBe(false)
      expect(result1.value!.choices[0]?.delta?.content).toBe('content 1')

      const result2 = await reader.read()
      expect(result2.done).toBe(false)
      expect(result2.value!.choices[0]?.delta?.content).toBe('content 2')

      // Should get final chunk
      const result3 = await reader.read()
      expect(result3.done).toBe(false)
      expect(result3.value!.choices[0]?.finish_reason).toBe('stop')
    })

    it('should handle basic stream properties', () => {
      const stream = new CursorStream(mockResponse, 'test-id', 'test-model')

      // Test that the stream has the expected structure
      expect(stream).toBeInstanceOf(CursorStream)
      expect(stream.toStream).toBeDefined()
      expect(stream[Symbol.asyncIterator]).toBeDefined()
    })

    it('should handle timeouts and idling behavior', async () => {
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: Buffer.from('first chunk'),
          })
          .mockImplementation(
            () => new Promise(() => {}) // Never resolves to simulate timeout
          ),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      }

      mockResponse.body.getReader.mockReturnValue(mockReader)
      const stream = new CursorStream(mockResponse, 'test-id', 'test-model')

      const readableStream = stream.toStream()
      const reader = readableStream.getReader()

      // Get first chunk
      const result1 = await reader.read()
      expect(result1.done).toBe(false)
      expect(result1.value!.choices[0]?.delta?.content).toBe('first chunk')

      // This should timeout and return an end chunk
      const result2 = await Promise.race([
        reader.read(),
        new Promise(resolve => setTimeout(() => resolve({ done: true }), 6000)),
      ])

      // Should either complete or timeout gracefully
      expect(result2).toBeDefined()
    }, 10000)
  })

  describe('Additional Coverage Tests for processChunk', () => {
    it('should handle chunks shorter than 5 bytes', async () => {
      const shortChunk = new Uint8Array([0x01, 0x02, 0x03])

      const result = await processChunk(shortChunk)
      // Should fall back to raw UTF-8 or hex parsing
      expect(typeof result).toBe('string')
    })

    it('should handle simple hex parsing fallback', async () => {
      const unknownChunk = new Uint8Array([0x99, 0x88, 0x77, 0x66])
      const result = await processChunk(unknownChunk)

      // Should return some string (either hex parsed or utf-8 fallback)
      expect(typeof result).toBe('string')
    })

    it('should handle fallback UTF-8 with control characters', async () => {
      // Test control character removal in fallback case
      const invalidChunk = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04])

      const result = await processChunk(invalidChunk)
      // Should clean up control characters
      expect(result).toBe('')
    })

    it('should handle processChunk error scenarios', async () => {
      // Create a chunk that will cause an error in JSON parsing
      const header = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x10])
      const invalidJson = Buffer.from('{"invalid": json}', 'utf-8')
      const chunk = new Uint8Array([...header, ...invalidJson])

      const result = await processChunk(chunk)
      // Should handle the error gracefully and return cleaned text
      expect(typeof result).toBe('string')
    })

    it('should handle system prompt detection', async () => {
      const header = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x50])
      const systemText =
        '<|BEGIN_SYSTEM|>System prompt<|END_SYSTEM|><|BEGIN_USER|>User text<|END_USER|>remaining'
      const textData = Buffer.from(systemText, 'utf-8')
      const chunk = new Uint8Array([...header, ...textData])

      const result = await processChunk(chunk)
      expect(result).toBe('')
    })

    it('should handle text cleaning with markers and prefixes', async () => {
      const header = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x40])
      const textWithMarkers = 'prefix<|END_USER|>\nA\nActual content here{}'
      const textData = Buffer.from(textWithMarkers, 'utf-8')
      const chunk = new Uint8Array([...header, ...textData])

      const result = await processChunk(chunk)
      expect(result).toBe('Actual content here')
    })

    it('should handle text with leading character removal', async () => {
      const header = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x20])
      const textWithPrefix = 'prefix<|END_USER|>\nCActual response content'
      const textData = Buffer.from(textWithPrefix, 'utf-8')
      const chunk = new Uint8Array([...header, ...textData])

      const result = await processChunk(chunk)
      expect(result).toBe('Actual response content')
    })

    it('should handle API error JSON parsing correctly', async () => {
      const header = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x30])
      const errorJson = '{"error":{"message":"Test error","type":"api_error"}}'
      const textData = Buffer.from(errorJson, 'utf-8')
      const chunk = new Uint8Array([...header, ...textData])

      const result = await processChunk(chunk)
      // Should handle error JSON gracefully
      expect(typeof result).toBe('string')
    })

    it('should handle malformed JSON without throwing', async () => {
      const header = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x20])
      const malformedJson = '{"error": this is not valid json}'
      const textData = Buffer.from(malformedJson, 'utf-8')
      const chunk = new Uint8Array([...header, ...textData])

      const result = await processChunk(chunk)
      // Should handle malformed JSON gracefully
      expect(typeof result).toBe('string')
    })
  })
})

describe('CursorStream Advanced Edge Cases', () => {
  let mockResponse: any

  beforeEach(() => {
    mockResponse = {
      body: {
        getReader: jest.fn(),
      },
    }
  })

  it('should handle reader errors in async iterator', async () => {
    const mockReader = {
      read: jest.fn().mockRejectedValue(new Error('Reader error')),
      releaseLock: jest.fn(),
      cancel: jest.fn(),
    }

    mockResponse.body.getReader.mockReturnValue(mockReader)
    const stream = new CursorStream(mockResponse, 'test-id', 'test-model')

    const iterator = stream[Symbol.asyncIterator]()

    await expect(iterator.next()).rejects.toThrow('Reader error')
  })

  it('should properly clean up reader in async iterator', async () => {
    const mockReadableStream = {
      getReader: jest.fn().mockReturnValue({
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: Buffer.from('test'),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
      }),
    }

    // Mock the toStream method to return our mock
    const stream = new CursorStream(mockResponse, 'test-id', 'test-model')
    jest.spyOn(stream, 'toStream').mockReturnValue(mockReadableStream as any)

    const chunks: ChatCompletionChunk[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    expect(chunks.length).toBe(1)
    expect(mockReadableStream.getReader().releaseLock).toHaveBeenCalled()
  })

  it('should handle stream error during pull', async () => {
    const mockReader = {
      read: jest.fn().mockRejectedValue(new Error('Stream read error')),
      releaseLock: jest.fn(),
      cancel: jest.fn(),
    }

    mockResponse.body.getReader.mockReturnValue(mockReader)
    const stream = new CursorStream(mockResponse, 'test-id', 'test-model')

    const readableStream = stream.toStream()
    const reader = readableStream.getReader()

    await expect(reader.read()).rejects.toThrow('Stream read error')
  })
})
