import {
  convertToCursorFormat,
  encodeChatMessage,
  createHexMessage,
  decodeResMessage,
  parseHexResponse,
  generateRandomId,
  generateChecksum,
  processChunk,
} from '../../src/lib/protobuf'
import { ChatMessage } from '../../src/types/chat'

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}))

describe('Protobuf Utilities', () => {
  describe('convertToCursorFormat', () => {
    it('should convert OpenAI messages to Cursor format', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]

      const result = convertToCursorFormat(messages, 'gpt-4o')

      expect(result.messages).toHaveLength(2)
      expect(result.messages?.[0]?.content).toBe('Hello')
      expect(result.messages?.[0]?.role).toBe(1) // user
      expect(result.messages?.[1]?.content).toBe('Hi there!')
      expect(result.messages?.[1]?.role).toBe(2) // assistant
      expect(result.instructions?.instruction).toBe(
        "Always respond in the user's preferred language"
      )
      expect(result.projectPath).toBe('/cursor-sdk-project')
      expect(result.model?.name).toBe('gpt-4o')
      expect(result.model?.empty).toBe('')
      expect(result.summary).toBe('')
    })

    it('should handle system messages', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
      ]

      const result = convertToCursorFormat(messages, 'claude-4-sonnet')

      expect(result.messages).toHaveLength(2)
      expect(result.messages?.[0]?.role).toBe(2) // system treated as assistant
      expect(result.messages?.[1]?.role).toBe(1) // user
    })

    it('should handle different model names', () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Test' }]
      const models = ['gpt-4.1', 'claude-3.7-sonnet', 'deepseek-r1']

      models.forEach(model => {
        const result = convertToCursorFormat(messages, model)
        expect(result.model?.name).toBe(model)
      })
    })
  })

  describe('encodeChatMessage', () => {
    it('should encode chat message to protobuf bytes', () => {
      const message = {
        messages: [
          {
            content: 'Hello',
            role: 1,
            messageId: 'test-id',
          },
        ],
        instructions: {
          instruction: 'Test instruction',
        },
        projectPath: '/test/path',
        model: {
          name: 'gpt-4o',
          empty: '',
        },
        requestId: 'req-123',
        summary: 'Test summary',
        conversationId: 'conv-123',
      }

      const result = encodeChatMessage(message)

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle empty messages array', () => {
      const message = {
        messages: [],
        instructions: null,
        projectPath: null,
        model: null,
        requestId: null,
        summary: null,
        conversationId: null,
      }

      const result = encodeChatMessage(message)

      expect(result).toBeInstanceOf(Uint8Array)
    })

    it('should handle partial message data', () => {
      const message = {
        messages: [
          {
            content: 'Hello',
            role: null,
            messageId: null,
          },
        ],
        instructions: {
          instruction: null,
        },
        projectPath: '/test',
        model: {
          name: 'gpt-4o',
          empty: null,
        },
        requestId: 'req-123',
        summary: null,
        conversationId: null,
      }

      const result = encodeChatMessage(message)

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle encodeChatMessage with null message instructions', () => {
      const messageWithNullInstructions = {
        messages: [{ content: 'test', role: 1, messageId: 'test-id' }],
        instructions: null,
        projectPath: 'test-path',
        model: { name: 'test-model', empty: '' },
        requestId: 'test-request',
        summary: 'test-summary',
        conversationId: 'test-conversation',
      }

      const result = encodeChatMessage(messageWithNullInstructions)
      expect(result).toBeInstanceOf(Uint8Array)
    })
  })

  describe('createHexMessage', () => {
    it('should create hex-encoded message', () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      const result = createHexMessage(messages, 'gpt-4o')

      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle multiple messages', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: 'How are you?' },
      ]

      const result = createHexMessage(messages, 'claude-4-sonnet')

      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle empty messages', () => {
      const messages: ChatMessage[] = []

      const result = createHexMessage(messages, 'gpt-4o')

      expect(result).toBeInstanceOf(Buffer)
    })
  })

  describe('decodeResMessage', () => {
    it('should decode response message', () => {
      // Create a simple protobuf message: field 1 (string) = "Hello"
      const buffer = new Uint8Array([0x0a, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f])

      const result = decodeResMessage(buffer)

      expect(result).toEqual({ msg: 'Hello' })
    })

    it('should handle empty buffer', () => {
      const buffer = new Uint8Array([])

      const result = decodeResMessage(buffer)

      expect(result).toEqual({})
    })

    it('should handle invalid protobuf data', () => {
      const buffer = new Uint8Array([0xff, 0xff, 0xff])

      // This will throw due to protobuf parsing error, which is expected
      expect(() => {
        decodeResMessage(buffer)
      }).toThrow()
    })

    it('should skip unknown fields', () => {
      // Field 2 (unknown) + Field 1 (string) = "Hello"
      const buffer = new Uint8Array([
        0x10,
        0x42, // Field 2: varint 66
        0x0a,
        0x05,
        0x48,
        0x65,
        0x6c,
        0x6c,
        0x6f, // Field 1: string "Hello"
      ])

      const result = decodeResMessage(buffer)

      expect(result).toEqual({ msg: 'Hello' })
    })
  })

  describe('parseHexResponse', () => {
    it('should parse hex response with valid messages', () => {
      // Create hex string: length (5) + protobuf message "Hello"
      const messageHex = '0a0548656c6c6f' // protobuf for string "Hello"
      const lengthHex = '0000000007' // length 7
      const hex = lengthHex + messageHex

      const result = parseHexResponse(hex)

      expect(result).toEqual(['Hello'])
    })

    it('should handle multiple messages', () => {
      // Two messages: "Hello" and "World"
      const message1Hex = '0a0548656c6c6f' // "Hello"
      const message2Hex = '0a05576f726c64' // "World"
      const length1Hex = '0000000007'
      const length2Hex = '0000000007'
      const hex = length1Hex + message1Hex + length2Hex + message2Hex

      const result = parseHexResponse(hex)

      expect(result).toEqual(['Hello', 'World'])
    })

    it('should handle empty hex string', () => {
      const result = parseHexResponse('')

      expect(result).toEqual([])
    })

    it('should handle invalid hex data', () => {
      const result = parseHexResponse('invalid-hex')

      expect(result).toEqual([])
    })

    it('should skip invalid messages', () => {
      // Valid message followed by invalid data
      const validHex = '0000000007' + '0a0548656c6c6f' // "Hello"
      const invalidHex = '0000000003' + 'ffff' // Invalid length/data
      const hex = validHex + invalidHex

      const result = parseHexResponse(hex)

      expect(result).toEqual(['Hello'])
    })

    it('should handle incomplete messages', () => {
      // Length indicates 10 bytes but only 5 provided
      const hex = '000000000a' + '0a0548656c6c6f'

      const result = parseHexResponse(hex)

      expect(result).toEqual([])
    })
  })

  describe('generateRandomId', () => {
    beforeEach(() => {
      // Mock Math.random for predictable results
      jest.spyOn(Math, 'random').mockReturnValue(0.5)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should generate ID with specified size', () => {
      const result = generateRandomId({ size: 10 })

      expect(result).toHaveLength(10)
    })

    it('should use alphabet dictionary', () => {
      const result = generateRandomId({ size: 5, dictType: 'alphabet' })

      expect(result).toHaveLength(5)
      expect(/^[a-zA-Z]+$/.test(result)).toBe(true)
    })

    it('should use max dictionary', () => {
      const result = generateRandomId({ size: 5, dictType: 'max' })

      expect(result).toHaveLength(5)
      expect(/^[0-9a-zA-Z_-]+$/.test(result)).toBe(true)
    })

    it('should use numeric dictionary', () => {
      const result = generateRandomId({ size: 5, dictType: 'numeric' })

      expect(result).toHaveLength(5)
      expect(/^[0-9]+$/.test(result)).toBe(true)
    })

    it('should use custom dictionary', () => {
      const customDict = 'ABC'
      const result = generateRandomId({ size: 5, customDict })

      expect(result).toHaveLength(5)
      expect(/^[ABC]+$/.test(result)).toBe(true)
    })

    it('should default to max dictionary', () => {
      const result = generateRandomId({ size: 5 })

      expect(result).toHaveLength(5)
    })
  })

  describe('generateChecksum', () => {
    beforeEach(() => {
      let callCount = 0
      jest.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        return callCount * 0.1 // Different values for each call
      })
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should generate checksum with correct format', () => {
      const result = generateChecksum()

      expect(result.startsWith('zo')).toBe(true)
      expect(result.includes('/')).toBe(true)
      expect(result.length).toBeGreaterThan(10)
    })

    it('should generate different checksums', () => {
      const checksum1 = generateChecksum()
      const checksum2 = generateChecksum()

      expect(checksum1).not.toBe(checksum2)
    })
  })

  describe('processChunk', () => {
    it('should process hex-encoded protobuf chunk', async () => {
      // Create a chunk with hex-encoded protobuf message
      const messageHex = '0000000007' + '0a0548656c6c6f' // "Hello"
      const chunk = Buffer.from(messageHex, 'hex')

      const result = await processChunk(chunk)

      expect(result).toBe('Hello')
    })

    it('should fallback to UTF-8 for non-hex data', async () => {
      const chunk = Buffer.from('Hello World', 'utf-8')

      const result = await processChunk(chunk)

      expect(result).toBe('Hello World')
    })

    it('should handle empty chunk', async () => {
      const chunk = new Uint8Array([])

      const result = await processChunk(chunk)

      expect(result).toBe('')
    })

    it('should handle invalid hex data', async () => {
      const chunk = Buffer.from('invalid-hex-data', 'utf-8')

      const result = await processChunk(chunk)

      expect(result).toBe('invalid-hex-data')
    })

    it('should handle binary data', async () => {
      const chunk = new Uint8Array([0x00, 0x01, 0x02, 0x03])

      const result = await processChunk(chunk)

      // Should fallback to UTF-8 interpretation
      expect(typeof result).toBe('string')
    })

    it('should cover processChunk fallback error handling', async () => {
      // Create a chunk that will trigger the fallback error handling
      const problematicChunk = new Uint8Array([0xfe, 0xff, 0xfd, 0xfc])

      const result = await processChunk(problematicChunk)
      expect(typeof result).toBe('string')
    })
  })

  describe('integration tests', () => {
    it('should convert, encode, and create hex message', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
      ]

      // Convert to Cursor format
      const cursorMessage = convertToCursorFormat(messages, 'gpt-4o')
      expect(cursorMessage.messages).toHaveLength(2)

      // Encode to protobuf
      const encoded = encodeChatMessage(cursorMessage)
      expect(encoded).toBeInstanceOf(Uint8Array)

      // Create hex message
      const hexMessage = createHexMessage(messages, 'gpt-4o')
      expect(hexMessage).toBeInstanceOf(Buffer)
    })

    it('should handle round-trip encoding/decoding', () => {
      const originalMessage = 'Test message'

      // Create protobuf message
      const protobufData = new Uint8Array([
        0x0a,
        0x0c,
        ...Buffer.from(originalMessage, 'utf-8'),
      ])

      // Decode it back
      const decoded = decodeResMessage(protobufData)

      expect(decoded.msg).toBe(originalMessage)
    })

    it('should handle various message types and models', () => {
      const testCases = [
        {
          messages: [{ role: 'user' as const, content: 'Simple test' }],
          model: 'gpt-4o',
        },
        {
          messages: [
            { role: 'system' as const, content: 'You are helpful' },
            { role: 'user' as const, content: 'Complex test' },
            { role: 'assistant' as const, content: 'Response' },
          ],
          model: 'claude-4-sonnet',
        },
        {
          messages: [{ role: 'user' as const, content: 'DeepSeek test' }],
          model: 'deepseek-r1',
        },
      ]

      testCases.forEach(({ messages, model }) => {
        const hexMessage = createHexMessage(messages, model)
        expect(hexMessage).toBeInstanceOf(Buffer)
        expect(hexMessage.length).toBeGreaterThan(0)
      })
    })

    it('should handle parseHexResponse with corrupt data gracefully', () => {
      // Test hex parsing with malformed data that would cause decodeResMessage to throw
      const corruptHex = '0000000005' + 'fffefd' // Invalid protobuf data

      const result = parseHexResponse(corruptHex)
      // Should skip invalid messages and return empty array
      expect(result).toEqual([])
    })

    it('should handle processChunk with various error scenarios', async () => {
      // Test processChunk error handling path
      const invalidData = new Uint8Array([0xff, 0xfe, 0xfd, 0xfc])

      const result = await processChunk(invalidData)
      // Should handle error gracefully and return fallback string
      expect(typeof result).toBe('string')
    })

    it('should handle generateChecksum edge cases', () => {
      // Mock Math.random to return edge values
      jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0) // First call returns 0
        .mockReturnValueOnce(0.999999) // Second call returns max value
        .mockReturnValueOnce(0.5) // Subsequent calls

      const checksum = generateChecksum()

      expect(checksum.startsWith('zo')).toBe(true)
      expect(checksum.includes('/')).toBe(true)

      jest.restoreAllMocks()
    })

    it('should handle generateRandomId with edge dictionary values', () => {
      // Test with empty custom dictionary (edge case)
      jest.spyOn(Math, 'random').mockReturnValue(0.5)

      const result = generateRandomId({
        size: 5,
        customDict: '', // Empty dictionary should fallback
      })

      expect(result).toHaveLength(5)

      jest.restoreAllMocks()
    })

    it('should handle encodeChatMessage with complex nested structures', () => {
      const complexMessage = {
        messages: [
          {
            content: 'Test with special chars: 你好 世界 🌍',
            role: 1,
            messageId: 'unicode-test-123',
          },
          {
            content: '', // Empty content
            role: 0, // Zero role
            messageId: null, // Null messageId
          },
        ],
        instructions: {
          instruction: 'Multi-line\ninstruction\nwith\nbreaks',
        },
        projectPath: '/very/long/project/path/with/many/segments',
        model: {
          name: 'model-with-dashes-and-dots-1.2.3',
          empty: null,
        },
        requestId: 'very-long-request-id-' + 'x'.repeat(100),
        summary: 'Summary with special chars: !@#$%^&*()',
        conversationId: 'conv-' + '0'.repeat(50),
      }

      const result = encodeChatMessage(complexMessage)
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Additional coverage for edge cases', () => {
    it('should handle generateRandomId with invalid dictionary type fallback', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5)

      const result = generateRandomId({
        size: 5,
        dictType: 'invalid' as any, // Force invalid type
      })

      expect(result).toHaveLength(5)
      // Should fallback to 'max' dictionary
      expect(typeof result).toBe('string')

      jest.restoreAllMocks()
    })

    it('should handle generateRandomId with empty custom dictionary', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5)

      const result = generateRandomId({
        size: 3,
        customDict: '', // Empty custom dictionary
      })

      expect(result).toHaveLength(3)
      // Should fallback to default behavior
      expect(typeof result).toBe('string')

      jest.restoreAllMocks()
    })

    it('should handle parseHexResponse with invalid hex length', () => {
      // Hex string with odd length (invalid hex)
      const invalidHex = '0000000007' + '0a0548656c6c6' // Missing last character

      const result = parseHexResponse(invalidHex)

      expect(result).toEqual([])
    })

    it('should handle parseHexResponse with corrupted length field', () => {
      // Length field indicates more bytes than available
      const corruptHex = 'ffffffff' + '0a0548656c6c6f' // Very large length

      const result = parseHexResponse(corruptHex)

      expect(result).toEqual([])
    })

    it('should handle processChunk with specific error scenarios', async () => {
      // Test the specific error scenarios mentioned in the code
      const chunkThatThrowsError = new Uint8Array([0xff, 0xfe, 0xfd])

      // Mock parseHexResponse to throw an error
      const originalParseHex =
        require('../../src/lib/protobuf').parseHexResponse
      const protobuf = require('../../src/lib/protobuf')
      protobuf.parseHexResponse = jest.fn().mockImplementation(() => {
        throw new Error('Hex parsing error')
      })

      const result = await processChunk(chunkThatThrowsError)

      // Should fall back to cleaned UTF-8
      expect(typeof result).toBe('string')

      // Restore original function
      protobuf.parseHexResponse = originalParseHex
    })

    it('should handle encodeChatMessage with all null values', () => {
      const messageWithNulls = {
        messages: null,
        instructions: null,
        projectPath: null,
        model: null,
        requestId: null,
        summary: null,
        conversationId: null,
      }

      const result = encodeChatMessage(messageWithNulls)

      expect(result).toBeInstanceOf(Uint8Array)
    })

    it('should handle convertToCursorFormat with edge case model names', () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Test' }]
      const edgeCaseModels = [
        '',
        'model-with-very-long-name-that-exceeds-normal-limits',
        'model.with.dots',
        'model_with_underscores',
        'MODEL-WITH-CAPS',
      ]

      edgeCaseModels.forEach(model => {
        const result = convertToCursorFormat(messages, model)
        expect(result.model?.name).toBe(model)
        expect(result.messages).toHaveLength(1)
      })
    })

    it('should handle createHexMessage with very large message arrays', () => {
      // Create a large array of messages
      const largeMessageArray: ChatMessage[] = Array.from(
        { length: 100 },
        (_, i) => ({
          role: 'user' as const,
          content: `Message ${i} with some content`,
        })
      )

      const result = createHexMessage(largeMessageArray, 'gpt-4o')

      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle decodeResMessage with malformed protobuf', () => {
      // Create a buffer that looks like protobuf but is malformed
      const malformedBuffer = new Uint8Array([
        0x08,
        0x96,
        0x01, // Field 1: varint 150
        0x12,
        0xff,
        0xff, // Field 2: length-delimited with invalid length
      ])

      expect(() => {
        decodeResMessage(malformedBuffer)
      }).toThrow()
    })

    it('should handle parseHexResponse with partial message at end', () => {
      // Valid message followed by incomplete message
      const validHex = '0000000007' + '0a0548656c6c6f' // "Hello"
      const partialHex = '0000000010' + '0a05' // Incomplete message
      const hex = validHex + partialHex

      const result = parseHexResponse(hex)

      expect(result).toEqual(['Hello'])
    })

    it('should handle generateChecksum with extreme Math.random values', () => {
      // Test with edge values for Math.random
      let callCount = 0
      jest.spyOn(Math, 'random').mockImplementation(() => {
        const values = [0, 0.999999, 0.5, 0.1, 0.9]
        return values[callCount++ % values.length] || 0
      })

      const checksum1 = generateChecksum()
      const checksum2 = generateChecksum()

      expect(checksum1.startsWith('zo')).toBe(true)
      expect(checksum1.includes('/')).toBe(true)
      expect(checksum2.startsWith('zo')).toBe(true)
      expect(checksum2.includes('/')).toBe(true)
      expect(checksum1).not.toBe(checksum2)

      jest.restoreAllMocks()
    })

    it('should handle processChunk with zero-length chunks', async () => {
      const emptyChunk = new Uint8Array(0)

      const result = await processChunk(emptyChunk)

      expect(result).toBe('')
    })

    it('should handle very specific protobuf encoding edge cases', () => {
      const edgeCaseMessage = {
        messages: [
          {
            content: '', // Empty content
            role: 0, // Zero role
            messageId: '', // Empty message ID
          },
          {
            content: 'A'.repeat(10000), // Very long content
            role: 999, // High role number
            messageId: 'x'.repeat(1000), // Very long message ID
          },
        ],
        instructions: {
          instruction: '', // Empty instruction
        },
        projectPath: '', // Empty project path
        model: {
          name: '', // Empty model name
          empty: '', // Empty field
        },
        requestId: '', // Empty request ID
        summary: '', // Empty summary
        conversationId: '', // Empty conversation ID
      }

      const result = encodeChatMessage(edgeCaseMessage)

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Specific uncovered line coverage', () => {
    it('should handle encodeChatMessage with null message instructions', () => {
      const messageWithNullInstructions = {
        messages: [{ content: 'test', role: 1, messageId: 'test-id' }],
        instructions: null,
        projectPath: 'test-path',
        model: { name: 'test-model', empty: '' },
        requestId: 'test-request',
        summary: 'test-summary',
        conversationId: 'test-conversation',
      }

      const result = encodeChatMessage(messageWithNullInstructions)
      expect(result).toBeInstanceOf(Uint8Array)
    })

    it('should cover processChunk fallback error handling', async () => {
      // Create a chunk that will trigger the fallback error handling
      const problematicChunk = new Uint8Array([0xfe, 0xff, 0xfd, 0xfc])

      const result = await processChunk(problematicChunk)
      expect(typeof result).toBe('string')
    })
  })
})
