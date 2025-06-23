import { BinaryWriter } from '@bufbuild/protobuf/wire'
import {
  ChatMessage,
  ChatMessage_FileContent,
  ChatMessage_FileContent_Position,
  ChatMessage_FileContent_Range,
  ChatMessage_UserMessage,
  ChatMessage_Instructions,
  ChatMessage_Model,
  ResMessage,
} from '../../src/lib/message'

describe('Message Protobuf Types', () => {
  describe('ChatMessage_FileContent_Position', () => {
    it('should create default position', () => {
      const position = ChatMessage_FileContent_Position.create()
      expect(position.line).toBe(0)
      expect(position.column).toBe(0)
    })

    it('should create position with values', () => {
      const position = ChatMessage_FileContent_Position.create({
        line: 10,
        column: 5,
      })
      expect(position.line).toBe(10)
      expect(position.column).toBe(5)
    })

    it('should encode and decode position', () => {
      const original = ChatMessage_FileContent_Position.create({
        line: 42,
        column: 13,
      })

      const writer = new BinaryWriter()
      ChatMessage_FileContent_Position.encode(original, writer)

      const encoded = writer.finish()
      const decoded = ChatMessage_FileContent_Position.decode(encoded)

      expect(decoded.line).toBe(42)
      expect(decoded.column).toBe(13)
    })

    it('should convert to/from JSON', () => {
      const position = ChatMessage_FileContent_Position.create({
        line: 100,
        column: 50,
      })

      const json = ChatMessage_FileContent_Position.toJSON(position)
      expect(json).toEqual({ line: 100, column: 50 })

      const fromJson = ChatMessage_FileContent_Position.fromJSON(json)
      expect(fromJson.line).toBe(100)
      expect(fromJson.column).toBe(50)
    })

    it('should create from partial', () => {
      const position = ChatMessage_FileContent_Position.fromPartial({
        line: 25,
      })
      expect(position.line).toBe(25)
      expect(position.column).toBe(0)
    })
  })

  describe('ChatMessage_FileContent_Range', () => {
    it('should create default range', () => {
      const range = ChatMessage_FileContent_Range.create()
      expect(range.start).toBeUndefined()
      expect(range.end).toBeUndefined()
    })

    it('should create range with positions', () => {
      const start = ChatMessage_FileContent_Position.create({
        line: 1,
        column: 0,
      })
      const end = ChatMessage_FileContent_Position.create({
        line: 5,
        column: 10,
      })

      const range = ChatMessage_FileContent_Range.create({
        start,
        end,
      })

      expect(range.start?.line).toBe(1)
      expect(range.start?.column).toBe(0)
      expect(range.end?.line).toBe(5)
      expect(range.end?.column).toBe(10)
    })

    it('should encode and decode range', () => {
      const original = ChatMessage_FileContent_Range.create({
        start: ChatMessage_FileContent_Position.create({ line: 1, column: 0 }),
        end: ChatMessage_FileContent_Position.create({ line: 2, column: 5 }),
      })

      const writer = new BinaryWriter()
      ChatMessage_FileContent_Range.encode(original, writer)

      const encoded = writer.finish()
      const decoded = ChatMessage_FileContent_Range.decode(encoded)

      expect(decoded.start?.line).toBe(1)
      expect(decoded.start?.column).toBe(0)
      expect(decoded.end?.line).toBe(2)
      expect(decoded.end?.column).toBe(5)
    })

    it('should convert to/from JSON', () => {
      const range = ChatMessage_FileContent_Range.create({
        start: ChatMessage_FileContent_Position.create({ line: 1, column: 0 }),
        end: ChatMessage_FileContent_Position.create({ line: 2, column: 5 }),
      })

      const json = ChatMessage_FileContent_Range.toJSON(range)
      expect(json).toEqual({
        start: { line: 1 }, // column: 0 is omitted when zero
        end: { line: 2, column: 5 },
      })

      const fromJson = ChatMessage_FileContent_Range.fromJSON(json)
      expect(fromJson.start?.line).toBe(1)
      expect(fromJson.end?.column).toBe(5)
    })

    it('should create from partial', () => {
      const range = ChatMessage_FileContent_Range.fromPartial({
        start: { line: 10 },
      })
      expect(range.start?.line).toBe(10)
      expect(range.start?.column).toBe(0)
      expect(range.end).toBeUndefined()
    })
  })

  describe('ChatMessage_FileContent', () => {
    it('should create default file content', () => {
      const fileContent = ChatMessage_FileContent.create()
      expect(fileContent.filename).toBe('')
      expect(fileContent.content).toBe('')
      expect(fileContent.language).toBe('')
      expect(fileContent.length).toBe(0)
      expect(fileContent.type).toBe(0)
      expect(fileContent.errorCode).toBe(0)
      expect(fileContent.position).toBeUndefined()
      expect(fileContent.range).toBeUndefined()
    })

    it('should create file content with values', () => {
      const fileContent = ChatMessage_FileContent.create({
        filename: 'test.ts',
        content: 'console.log("hello")',
        language: 'typescript',
        length: 20,
        type: 1,
        errorCode: 0,
        position: ChatMessage_FileContent_Position.create({
          line: 1,
          column: 0,
        }),
        range: ChatMessage_FileContent_Range.create({
          start: ChatMessage_FileContent_Position.create({
            line: 1,
            column: 0,
          }),
          end: ChatMessage_FileContent_Position.create({ line: 1, column: 20 }),
        }),
      })

      expect(fileContent.filename).toBe('test.ts')
      expect(fileContent.content).toBe('console.log("hello")')
      expect(fileContent.language).toBe('typescript')
      expect(fileContent.length).toBe(20)
      expect(fileContent.type).toBe(1)
      expect(fileContent.position?.line).toBe(1)
      expect(fileContent.range?.start?.line).toBe(1)
      expect(fileContent.range?.end?.column).toBe(20)
    })

    it('should encode and decode file content', () => {
      const original = ChatMessage_FileContent.create({
        filename: 'example.js',
        content: 'function test() {}',
        language: 'javascript',
        length: 18,
        type: 2,
        errorCode: 404,
      })

      const writer = new BinaryWriter()
      ChatMessage_FileContent.encode(original, writer)

      const encoded = writer.finish()
      const decoded = ChatMessage_FileContent.decode(encoded)

      expect(decoded.filename).toBe('example.js')
      expect(decoded.content).toBe('function test() {}')
      expect(decoded.language).toBe('javascript')
      expect(decoded.length).toBe(18)
      expect(decoded.type).toBe(2)
      expect(decoded.errorCode).toBe(404)
    })

    it('should convert to/from JSON', () => {
      const fileContent = ChatMessage_FileContent.create({
        filename: 'test.py',
        content: 'print("hello world")',
        language: 'python',
      })

      const json = ChatMessage_FileContent.toJSON(fileContent)
      expect(json).toEqual({
        filename: 'test.py',
        content: 'print("hello world")',
        language: 'python',
        // length: 0, type: 0, errorCode: 0 are omitted when zero in JSON
      })

      const fromJson = ChatMessage_FileContent.fromJSON(json)
      expect(fromJson.filename).toBe('test.py')
      expect(fromJson.content).toBe('print("hello world")')
      expect(fromJson.language).toBe('python')
    })

    it('should create from partial', () => {
      const fileContent = ChatMessage_FileContent.fromPartial({
        filename: 'partial.txt',
        length: 100,
      })
      expect(fileContent.filename).toBe('partial.txt')
      expect(fileContent.length).toBe(100)
      expect(fileContent.content).toBe('')
      expect(fileContent.language).toBe('')
    })
  })

  describe('ChatMessage_UserMessage', () => {
    it('should create default user message', () => {
      const message = ChatMessage_UserMessage.create()
      expect(message.content).toBe('')
      expect(message.role).toBe(0)
      expect(message.messageId).toBe('')
    })

    it('should create user message with values', () => {
      const message = ChatMessage_UserMessage.create({
        content: 'Hello, how are you?',
        role: 1,
        messageId: 'msg-123',
      })

      expect(message.content).toBe('Hello, how are you?')
      expect(message.role).toBe(1)
      expect(message.messageId).toBe('msg-123')
    })

    it('should encode and decode user message', () => {
      const original = ChatMessage_UserMessage.create({
        content: 'Test message',
        role: 2,
        messageId: 'test-id-456',
      })

      const writer = new BinaryWriter()
      ChatMessage_UserMessage.encode(original, writer)

      const encoded = writer.finish()
      const decoded = ChatMessage_UserMessage.decode(encoded)

      expect(decoded.content).toBe('Test message')
      expect(decoded.role).toBe(2)
      expect(decoded.messageId).toBe('test-id-456')
    })

    it('should convert to/from JSON', () => {
      const message = ChatMessage_UserMessage.create({
        content: 'JSON test',
        role: 3,
        messageId: 'json-msg-789',
      })

      const json = ChatMessage_UserMessage.toJSON(message)
      expect(json).toEqual({
        content: 'JSON test',
        role: 3,
        messageId: 'json-msg-789',
      })

      const fromJson = ChatMessage_UserMessage.fromJSON(json)
      expect(fromJson.content).toBe('JSON test')
      expect(fromJson.role).toBe(3)
      expect(fromJson.messageId).toBe('json-msg-789')
    })

    it('should create from partial', () => {
      const message = ChatMessage_UserMessage.fromPartial({
        content: 'Partial message',
      })
      expect(message.content).toBe('Partial message')
      expect(message.role).toBe(0)
      expect(message.messageId).toBe('')
    })
  })

  describe('ChatMessage_Instructions', () => {
    it('should create default instructions', () => {
      const instructions = ChatMessage_Instructions.create()
      expect(instructions.instruction).toBe('')
    })

    it('should create instructions with value', () => {
      const instructions = ChatMessage_Instructions.create({
        instruction: 'Please be helpful and accurate',
      })
      expect(instructions.instruction).toBe('Please be helpful and accurate')
    })

    it('should encode and decode instructions', () => {
      const original = ChatMessage_Instructions.create({
        instruction: 'Follow these guidelines carefully',
      })

      const writer = new BinaryWriter()
      ChatMessage_Instructions.encode(original, writer)

      const encoded = writer.finish()
      const decoded = ChatMessage_Instructions.decode(encoded)

      expect(decoded.instruction).toBe('Follow these guidelines carefully')
    })

    it('should convert to/from JSON', () => {
      const instructions = ChatMessage_Instructions.create({
        instruction: 'Be concise and clear',
      })

      const json = ChatMessage_Instructions.toJSON(instructions)
      expect(json).toEqual({
        instruction: 'Be concise and clear',
      })

      const fromJson = ChatMessage_Instructions.fromJSON(json)
      expect(fromJson.instruction).toBe('Be concise and clear')
    })

    it('should create from partial', () => {
      const instructions = ChatMessage_Instructions.fromPartial({
        instruction: 'Partial instruction',
      })
      expect(instructions.instruction).toBe('Partial instruction')
    })
  })

  describe('ChatMessage_Model', () => {
    it('should create default model', () => {
      const model = ChatMessage_Model.create()
      expect(model.name).toBe('')
      expect(model.empty).toBe('')
    })

    it('should create model with values', () => {
      const model = ChatMessage_Model.create({
        name: 'gpt-4o',
        empty: 'empty-field',
      })
      expect(model.name).toBe('gpt-4o')
      expect(model.empty).toBe('empty-field')
    })

    it('should encode and decode model', () => {
      const original = ChatMessage_Model.create({
        name: 'claude-3-sonnet',
        empty: 'test-empty',
      })

      const writer = new BinaryWriter()
      ChatMessage_Model.encode(original, writer)

      const encoded = writer.finish()
      const decoded = ChatMessage_Model.decode(encoded)

      expect(decoded.name).toBe('claude-3-sonnet')
      expect(decoded.empty).toBe('test-empty')
    })

    it('should convert to/from JSON', () => {
      const model = ChatMessage_Model.create({
        name: 'gpt-3.5-turbo',
        empty: '',
      })

      const json = ChatMessage_Model.toJSON(model)
      expect(json).toEqual({
        name: 'gpt-3.5-turbo',
        // empty: '' is omitted when empty string in JSON
      })

      const fromJson = ChatMessage_Model.fromJSON(json)
      expect(fromJson.name).toBe('gpt-3.5-turbo')
      expect(fromJson.empty).toBe('')
    })

    it('should create from partial', () => {
      const model = ChatMessage_Model.fromPartial({
        name: 'partial-model',
      })
      expect(model.name).toBe('partial-model')
      expect(model.empty).toBe('')
    })
  })

  describe('ChatMessage', () => {
    it('should create default chat message', () => {
      const chatMessage = ChatMessage.create()
      expect(chatMessage.messages).toEqual([])
      expect(chatMessage.instructions).toBeUndefined()
      expect(chatMessage.projectPath).toBe('')
      expect(chatMessage.model).toBeUndefined()
      expect(chatMessage.requestId).toBe('')
      expect(chatMessage.summary).toBe('')
      expect(chatMessage.conversationId).toBe('')
    })

    it('should create chat message with full data', () => {
      const userMessage = ChatMessage_UserMessage.create({
        content: 'Hello',
        role: 1,
        messageId: 'msg-1',
      })

      const instructions = ChatMessage_Instructions.create({
        instruction: 'Be helpful',
      })

      const model = ChatMessage_Model.create({
        name: 'gpt-4o',
        empty: '',
      })

      const chatMessage = ChatMessage.create({
        messages: [userMessage],
        instructions,
        projectPath: '/path/to/project',
        model,
        requestId: 'req-123',
        summary: 'Test conversation',
        conversationId: 'conv-456',
      })

      expect(chatMessage.messages).toHaveLength(1)
      expect(chatMessage.messages[0]?.content).toBe('Hello')
      expect(chatMessage.instructions?.instruction).toBe('Be helpful')
      expect(chatMessage.projectPath).toBe('/path/to/project')
      expect(chatMessage.model?.name).toBe('gpt-4o')
      expect(chatMessage.requestId).toBe('req-123')
      expect(chatMessage.summary).toBe('Test conversation')
      expect(chatMessage.conversationId).toBe('conv-456')
    })

    it('should encode and decode chat message', () => {
      const original = ChatMessage.create({
        messages: [
          ChatMessage_UserMessage.create({
            content: 'Test message',
            role: 1,
            messageId: 'test-msg',
          }),
        ],
        projectPath: '/test/path',
        requestId: 'test-request',
        summary: 'Test summary',
        conversationId: 'test-conversation',
      })

      const writer = new BinaryWriter()
      ChatMessage.encode(original, writer)

      const encoded = writer.finish()
      const decoded = ChatMessage.decode(encoded)

      expect(decoded.messages).toHaveLength(1)
      expect(decoded.messages[0]?.content).toBe('Test message')
      expect(decoded.projectPath).toBe('/test/path')
      expect(decoded.requestId).toBe('test-request')
      expect(decoded.summary).toBe('Test summary')
      expect(decoded.conversationId).toBe('test-conversation')
    })

    it('should convert to/from JSON', () => {
      const chatMessage = ChatMessage.create({
        messages: [
          ChatMessage_UserMessage.create({
            content: 'JSON test',
            role: 2,
            messageId: 'json-msg',
          }),
        ],
        projectPath: '/json/path',
        model: ChatMessage_Model.create({
          name: 'test-model',
          empty: '',
        }),
      })

      const json = ChatMessage.toJSON(chatMessage)
      expect(json).toEqual({
        messages: [
          {
            content: 'JSON test',
            role: 2,
            messageId: 'json-msg',
          },
        ],
        projectPath: '/json/path',
        model: {
          name: 'test-model',
          // empty: '' is omitted when empty string in JSON
        },
        // requestId: '', summary: '', conversationId: '' are omitted when empty strings
      })

      const fromJson = ChatMessage.fromJSON(json)
      expect(fromJson.messages).toHaveLength(1)
      expect(fromJson.messages[0]?.content).toBe('JSON test')
      expect(fromJson.projectPath).toBe('/json/path')
      expect(fromJson.model?.name).toBe('test-model')
    })

    it('should create from partial', () => {
      const chatMessage = ChatMessage.fromPartial({
        messages: [
          {
            content: 'Partial message',
            role: 1,
          },
        ],
        projectPath: '/partial/path',
      })

      expect(chatMessage.messages).toHaveLength(1)
      expect(chatMessage.messages[0]?.content).toBe('Partial message')
      expect(chatMessage.messages[0]?.role).toBe(1)
      expect(chatMessage.messages[0]?.messageId).toBe('')
      expect(chatMessage.projectPath).toBe('/partial/path')
      expect(chatMessage.requestId).toBe('')
    })

    it('should handle empty arrays and undefined values in JSON', () => {
      const json = {
        messages: [],
        projectPath: '/empty/path',
        requestId: 'empty-req',
        summary: '',
        conversationId: '',
      }

      const fromJson = ChatMessage.fromJSON(json)
      expect(fromJson.messages).toEqual([])
      expect(fromJson.instructions).toBeUndefined()
      expect(fromJson.model).toBeUndefined()
      expect(fromJson.projectPath).toBe('/empty/path')
      expect(fromJson.requestId).toBe('empty-req')
    })
  })

  describe('ResMessage', () => {
    it('should create default res message', () => {
      const resMessage = ResMessage.create()
      expect(resMessage.msg).toBe('')
    })

    it('should create res message with value', () => {
      const resMessage = ResMessage.create({
        msg: 'Response message',
      })
      expect(resMessage.msg).toBe('Response message')
    })

    it('should encode and decode res message', () => {
      const original = ResMessage.create({
        msg: 'Test response',
      })

      const writer = new BinaryWriter()
      ResMessage.encode(original, writer)

      const encoded = writer.finish()
      const decoded = ResMessage.decode(encoded)

      expect(decoded.msg).toBe('Test response')
    })

    it('should convert to/from JSON', () => {
      const resMessage = ResMessage.create({
        msg: 'JSON response',
      })

      const json = ResMessage.toJSON(resMessage)
      expect(json).toEqual({
        msg: 'JSON response',
      })

      const fromJson = ResMessage.fromJSON(json)
      expect(fromJson.msg).toBe('JSON response')
    })

    it('should create from partial', () => {
      const resMessage = ResMessage.fromPartial({
        msg: 'Partial response',
      })
      expect(resMessage.msg).toBe('Partial response')
    })

    it('should handle empty string in JSON conversion', () => {
      const resMessage = ResMessage.create({ msg: '' })
      const json = ResMessage.toJSON(resMessage)
      expect(json).toEqual({})

      const fromJson = ResMessage.fromJSON({ msg: '' })
      expect(fromJson.msg).toBe('')
    })
  })

  // Additional edge case tests to improve coverage
  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle ChatMessage_Instructions with empty instruction', () => {
      const instructions = ChatMessage_Instructions.create({ instruction: '' })
      const json = ChatMessage_Instructions.toJSON(instructions)
      expect(json).toEqual({})

      const fromJson = ChatMessage_Instructions.fromJSON({})
      expect(fromJson.instruction).toBe('')
    })

    it('should handle ChatMessage_Model with empty fields', () => {
      const model = ChatMessage_Model.create({ name: '', empty: '' })
      const json = ChatMessage_Model.toJSON(model)
      expect(json).toEqual({})

      const fromPartial = ChatMessage_Model.fromPartial({})
      expect(fromPartial.name).toBe('')
      expect(fromPartial.empty).toBe('')
    })

    it('should handle ChatMessage_FileContent with all zero/empty values', () => {
      const fileContent = ChatMessage_FileContent.create({
        filename: '',
        content: '',
        language: '',
        length: 0,
        type: 0,
        errorCode: 0,
      })

      const json = ChatMessage_FileContent.toJSON(fileContent)
      expect(json).toEqual({})
    })

    it('should handle ChatMessage_UserMessage with empty fields', () => {
      const userMessage = ChatMessage_UserMessage.create({
        content: '',
        role: 0,
        messageId: '',
      })

      const json = ChatMessage_UserMessage.toJSON(userMessage)
      expect(json).toEqual({})
    })

    it('should handle ChatMessage_FileContent_Position with zero values', () => {
      const position = ChatMessage_FileContent_Position.create({
        line: 0,
        column: 0,
      })

      const json = ChatMessage_FileContent_Position.toJSON(position)
      expect(json).toEqual({})
    })

    it('should test fromJSON with null/undefined values', () => {
      const chatMessage = ChatMessage.fromJSON({
        messages: null,
        instructions: undefined,
        projectPath: null,
        model: undefined,
        requestId: null,
        summary: undefined,
        conversationId: null,
      })

      expect(chatMessage.messages).toEqual([])
      expect(chatMessage.instructions).toBeUndefined()
      expect(chatMessage.projectPath).toBe('')
      expect(chatMessage.model).toBeUndefined()
      expect(chatMessage.requestId).toBe('')
      expect(chatMessage.summary).toBe('')
      expect(chatMessage.conversationId).toBe('')
    })

    it('should test fromPartial with empty object', () => {
      const fileContent = ChatMessage_FileContent.fromPartial({})

      expect(fileContent.filename).toBe('')
      expect(fileContent.content).toBe('')
      expect(fileContent.position).toBeUndefined()
      expect(fileContent.range).toBeUndefined()
      expect(fileContent.language).toBe('')
      expect(fileContent.length).toBe(0)
      expect(fileContent.type).toBe(0)
      expect(fileContent.errorCode).toBe(0)
    })

    it('should handle binary decoding with different tag types', () => {
      // Test binary format parsing for different scenarios
      const writer = new BinaryWriter()

      // Write a ChatMessage_Instructions with instruction
      writer.uint32(10).string('test instruction')
      const encoded = writer.finish()

      const decoded = ChatMessage_Instructions.decode(encoded)
      expect(decoded.instruction).toBe('test instruction')
    })

    it('should handle ChatMessage with complex nested data', () => {
      const complex = ChatMessage.create({
        messages: [
          ChatMessage_UserMessage.create({
            content: 'Complex test',
            role: 1,
            messageId: 'complex-msg',
          }),
        ],
        instructions: ChatMessage_Instructions.create({
          instruction: 'Complex instruction',
        }),
        projectPath: '/complex/path',
        model: ChatMessage_Model.create({
          name: 'complex-model',
          empty: 'not-empty',
        }),
        requestId: 'complex-req',
        summary: 'Complex summary',
        conversationId: 'complex-conv',
      })

      const json = ChatMessage.toJSON(complex)
      expect(json).toHaveProperty('messages')
      expect(json).toHaveProperty('instructions')
      expect(json).toHaveProperty('projectPath')
      expect(json).toHaveProperty('model')
      expect(json).toHaveProperty('requestId')
      expect(json).toHaveProperty('summary')
      expect(json).toHaveProperty('conversationId')

      const roundTrip = ChatMessage.fromJSON(json)
      expect(roundTrip.messages[0]?.content).toBe('Complex test')
      expect(roundTrip.instructions?.instruction).toBe('Complex instruction')
      expect(roundTrip.model?.name).toBe('complex-model')
      expect(roundTrip.model?.empty).toBe('not-empty')
    })
  })
})
