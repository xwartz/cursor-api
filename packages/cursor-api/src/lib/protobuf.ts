import * as $protobuf from 'protobufjs/minimal.js'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage as OpenAIChatMessage } from '../types/chat'

// Common aliases
const $Reader = $protobuf.Reader
const $Writer = $protobuf.Writer

/**
 * Internal protobuf message definitions (converted from the original .proto file)
 */

// ChatMessage namespace
export interface IChatMessage {
  messages?: IChatMessage_UserMessage[] | null
  instructions?: IChatMessage_Instructions | null
  projectPath?: string | null
  model?: IChatMessage_Model | null
  requestId?: string | null
  summary?: string | null
  conversationId?: string | null
}

export interface IChatMessage_UserMessage {
  content?: string | null
  role?: number | null
  messageId?: string | null
}

export interface IChatMessage_Instructions {
  instruction?: string | null
}

export interface IChatMessage_Model {
  name?: string | null
  empty?: string | null
}

export interface IResMessage {
  msg?: string | null
}

/**
 * Convert OpenAI format messages to Cursor internal format
 */
export function convertToCursorFormat(
  messages: OpenAIChatMessage[],
  modelName: string
): IChatMessage {
  const formattedMessages: IChatMessage_UserMessage[] = messages.map(msg => ({
    content: msg.content,
    role: msg.role === 'user' ? 1 : 2, // 1 = user, 2 = assistant
    messageId: uuidv4(),
  }))

  return {
    messages: formattedMessages,
    instructions: {
      instruction: "Always respond in the user's preferred language",
    },
    projectPath: '/cursor-sdk-project',
    model: {
      name: modelName,
      empty: '',
    },
    requestId: uuidv4(),
    summary: '',
    conversationId: uuidv4(),
  }
}

/**
 * Encode chat message to protobuf bytes
 */
export function encodeChatMessage(message: IChatMessage): Uint8Array {
  const writer = $Writer.create()

  // Encode messages array
  if (message.messages && message.messages.length > 0) {
    for (const msg of message.messages) {
      const msgWriter = $Writer.create()
      if (msg.content != null) {
        msgWriter.uint32(10).string(msg.content) // field 1
      }
      if (msg.role != null) {
        msgWriter.uint32(16).int32(msg.role) // field 2
      }
      if (msg.messageId != null) {
        msgWriter.uint32(106).string(msg.messageId) // field 13
      }
      writer.uint32(18).fork().ldelim() // field 2
      writer.uint32(18).bytes(msgWriter.finish())
    }
  }

  // Encode instructions
  if (message.instructions != null) {
    const instWriter = $Writer.create()
    if (message.instructions.instruction != null) {
      instWriter.uint32(10).string(message.instructions.instruction) // field 1
    }
    writer.uint32(34).bytes(instWriter.finish()) // field 4
  }

  // Encode other fields
  if (message.projectPath != null) {
    writer.uint32(42).string(message.projectPath) // field 5
  }

  if (message.model != null) {
    const modelWriter = $Writer.create()
    if (message.model.name != null) {
      modelWriter.uint32(10).string(message.model.name) // field 1
    }
    if (message.model.empty != null) {
      modelWriter.uint32(34).string(message.model.empty) // field 4
    }
    writer.uint32(58).bytes(modelWriter.finish()) // field 7
  }

  if (message.requestId != null) {
    writer.uint32(74).string(message.requestId) // field 9
  }

  if (message.summary != null) {
    writer.uint32(90).string(message.summary) // field 11
  }

  if (message.conversationId != null) {
    writer.uint32(122).string(message.conversationId) // field 15
  }

  return writer.finish()
}

/**
 * Create hex-encoded message for Cursor API
 */
export function createHexMessage(
  messages: OpenAIChatMessage[],
  modelName: string
): Buffer {
  const cursorMessage = convertToCursorFormat(messages, modelName)
  const buffer = encodeChatMessage(cursorMessage)

  // Create length-prefixed hex string
  const hexString = (
    buffer.length.toString(16).padStart(10, '0') +
    Buffer.from(buffer).toString('hex')
  ).toUpperCase()

  return Buffer.from(hexString, 'hex')
}

/**
 * Decode response message from protobuf
 */
export function decodeResMessage(buffer: Uint8Array): IResMessage {
  const reader = $Reader.create(buffer)
  const message: IResMessage = {}

  while (reader.pos < reader.len) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1: {
        message.msg = reader.string()
        break
      }
      default:
        reader.skipType(tag & 7)
        break
    }
  }

  return message
}

/**
 * Parse hex response to extract messages
 */
export function parseHexResponse(hex: string): string[] {
  const results: string[] = []
  let offset = 0

  while (offset < hex.length) {
    if (offset + 10 > hex.length) break

    const dataLength = parseInt(hex.slice(offset, offset + 10), 16)
    offset += 10

    if (offset + dataLength * 2 > hex.length) break

    const messageHex = hex.slice(offset, offset + dataLength * 2)
    offset += dataLength * 2

    try {
      const messageBuffer = Buffer.from(messageHex, 'hex')
      const message = decodeResMessage(messageBuffer)
      if (message.msg) {
        results.push(message.msg)
      }
    } catch (error) {
      // Skip invalid messages
      continue
    }
  }

  return results
}

/**
 * Generate random ID for checksums
 */
export function generateRandomId(options: {
  size: number
  dictType?: 'alphabet' | 'max' | 'numeric'
  customDict?: string
}): string {
  const { size, dictType = 'max', customDict } = options

  let dict = customDict
  if (!dict) {
    switch (dictType) {
      case 'alphabet':
        dict = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
        break
      case 'max':
        dict =
          '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-'
        break
      default:
        dict = '0123456789'
    }
  }

  let result = ''
  for (let i = 0; i < size; i++) {
    result += dict[Math.floor(Math.random() * dict.length)]
  }

  return result
}

/**
 * Generate checksum for Cursor API
 */
export function generateChecksum(): string {
  return `zo${generateRandomId({ dictType: 'max', size: 6 })}${generateRandomId(
    {
      dictType: 'max',
      size: 64,
    }
  )}/${generateRandomId({ dictType: 'max', size: 64 })}`
}

/**
 * Process a chunk from the response stream
 * This is a simplified version - full implementation is in streaming.ts
 */
export async function processChunk(chunk: Uint8Array): Promise<string> {
  try {
    // Try to parse as hex-encoded protobuf messages first
    const hex = Buffer.from(chunk).toString('hex')
    const messages = parseHexResponse(hex)

    if (messages.length > 0) {
      return messages.join('')
    }

    // Fallback to raw UTF-8
    return Buffer.from(chunk).toString('utf-8')
  } catch (error) {
    return Buffer.from(chunk).toString('utf-8')
  }
}
