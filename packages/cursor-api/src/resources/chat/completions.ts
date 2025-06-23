import { v4 as uuidv4 } from 'uuid'
import type { APIClient } from '../../core/api'
import type { RequestOptions } from '../../types/shared'
import type {
  ChatCompletionCreateParams,
  ChatCompletion,
  ChatCompletionChunk,
} from '../../types/chat'
import { createHexMessage } from '../../lib/protobuf'
import { CursorStream, processChunk } from '../../core/streaming'
import { BadRequestError } from '../../core/errors'

/**
 * Chat completions resource
 */
export class ChatCompletions {
  constructor(private client: APIClient) {}

  /**
   * Create a chat completion
   */
  async create(
    params: ChatCompletionCreateParams,
    options?: RequestOptions
  ): Promise<ChatCompletion>

  /**
   * Create a streaming chat completion
   */
  async create(
    params: ChatCompletionCreateParams & { stream: true },
    options?: RequestOptions
  ): Promise<ReadableStream<ChatCompletionChunk>>

  /**
   * Implementation for both streaming and non-streaming
   */
  async create(
    params: ChatCompletionCreateParams,
    options?: RequestOptions
  ): Promise<ChatCompletion | ReadableStream<ChatCompletionChunk>> {
    // Validate parameters
    this.validateParams(params)

    // Prepare request body
    const hexData = createHexMessage(params.messages, params.model)
    const responseId = `chatcmpl-${uuidv4()}`

    if (params.stream) {
      return this.createStream(hexData, responseId, params.model, options)
    } else {
      return this.createCompletion(hexData, responseId, params.model, options)
    }
  }

  /**
   * Create streaming completion
   */
  private async createStream(
    hexData: Buffer,
    responseId: string,
    model: string,
    options?: RequestOptions
  ): Promise<ReadableStream<ChatCompletionChunk>> {
    const response = await this.client.post<Response>(
      '/aiserver.v1.AiService/StreamChat',
      hexData,
      {
        ...options,
        stream: true,
      }
    )

    const cursorStream = new CursorStream(response, responseId, model)
    return cursorStream.toStream()
  }

  /**
   * Create non-streaming completion
   */
  private async createCompletion(
    hexData: Buffer,
    responseId: string,
    model: string,
    options?: RequestOptions
  ): Promise<ChatCompletion> {
    const response = await this.client.post<Response>(
      '/aiserver.v1.AiService/StreamChat',
      hexData,
      options
    )

    if (!response.body) {
      throw new Error('Response body is null')
    }

    // Collect all raw chunks first
    const chunks: Uint8Array[] = []
    const reader = response.body.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }

    // Process chunks together for better gzip handling
    let text = await this.processResponseChunks(chunks)

    // Clean up the response text
    text = this.cleanResponseText(text)

    return {
      id: responseId,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: text,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 0, // Cursor doesn't provide token usage
        completion_tokens: 0,
        total_tokens: 0,
      },
    }
  }

  /**
   * Process multiple response chunks, handling gzip decompression
   */
  private async processResponseChunks(chunks: Uint8Array[]): Promise<string> {
    let result = ''

    // Try to combine gzip chunks if needed
    const gzipChunks: Uint8Array[] = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      if (!chunk) continue

      // Check if this chunk contains gzip data
      if (chunk.length > 5) {
        let headerSize = 0
        if (chunk[0] === 0x01 && chunk[1] === 0x00 && chunk[2] === 0x00) {
          headerSize = 5
        } else if (
          chunk[0] === 0x02 &&
          chunk[1] === 0x00 &&
          chunk[2] === 0x00
        ) {
          headerSize = 5
        }

        const payload = chunk.slice(headerSize)
        if (payload[0] === 0x1f && payload[1] === 0x8b) {
          gzipChunks.push(payload)
          continue
        }
      }

      // Check for chunks with 4-byte zero prefix (protobuf data)
      if (
        chunk.length > 4 &&
        chunk[0] === 0x00 &&
        chunk[1] === 0x00 &&
        chunk[2] === 0x00 &&
        chunk[3] === 0x00
      ) {
        // Skip the 4-byte zero prefix and process as protobuf
        const protobufData = chunk.slice(4)
        const chunkText = await processChunk(protobufData)
        result += chunkText
        continue
      }

      // Process non-gzip chunks normally
      const chunkText = await processChunk(chunk)
      result += chunkText
    }

    // If we have gzip chunks, try to combine and decompress them
    if (gzipChunks.length > 0) {
      try {
        // Combine all gzip chunks
        const totalLength = gzipChunks.reduce(
          (sum, chunk) => sum + chunk.length,
          0
        )
        const combined = new Uint8Array(totalLength)
        let offset = 0
        for (const chunk of gzipChunks) {
          combined.set(chunk, offset)
          offset += chunk.length
        }

        // Import zlib and decompress
        const zlib = require('zlib')
        const decompressed = zlib.gunzipSync(combined)
        result += decompressed.toString('utf-8')
      } catch (error) {
        // Fallback to processing chunks individually
        for (const chunk of gzipChunks) {
          try {
            const zlib = require('zlib')
            const decompressed = zlib.gunzipSync(chunk)
            result += decompressed.toString('utf-8')
          } catch (e) {
            // Skip invalid chunks
          }
        }
      }
    }

    return result
  }

  /**
   * Clean protobuf control characters from text
   */
  private cleanProtobufText(text: string): string {
    // Extract readable text from protobuf format
    // Pattern: control_char + length + text
    let result = ''
    let i = 0

    while (i < text.length) {
      const char = text.charCodeAt(i)

      // Look for protobuf field markers (usually 0x0A = 10 for string fields)
      if (char === 0x0a && i + 1 < text.length) {
        // Next byte should be the length
        const length = text.charCodeAt(i + 1)
        if (length > 0 && i + 2 + length <= text.length) {
          // Extract the text content
          const content = text.slice(i + 2, i + 2 + length)
          result += content
          i += 2 + length
          continue
        }
      }

      // Look for other text patterns
      if (char >= 32 && char <= 126) {
        // Printable ASCII character
        result += text[i]
      }

      i++
    }

    return result.trim()
  }

  /**
   * Clean response text by removing system markers
   */
  private cleanResponseText(text: string): string {
    // Check if this is a JSON error response
    try {
      const jsonMatch = text.match(/\{.*\}/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[0]
        const parsed = JSON.parse(jsonStr)
        if (parsed.error) {
          // This is an error response, throw it as an error
          throw new Error(
            `API Error: ${JSON.stringify(parsed.error) || 'Unknown error'}`
          )
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('API Error:')) {
        throw error
      }
      // If it's not a JSON parse error, continue with normal processing
    }

    // First, try to extract content that appears before the system prompt
    // This handles cases where the actual response comes first
    const systemStart = text.indexOf('<|BEGIN_SYSTEM|>')
    if (systemStart > 0) {
      const beforeSystem = text.slice(0, systemStart).trim()
      // Clean up any JSON artifacts
      let cleanedBefore = beforeSystem.replace(/^\s*{}\s*/, '').trim()

      // Clean up protobuf control characters
      cleanedBefore = this.cleanProtobufText(cleanedBefore)

      // Remove any trailing artifacts like {}, quotes, etc.
      cleanedBefore = cleanedBefore
        .replace(/[{}"*]+$/, '')
        .split('')
        .filter(char => {
          const code = char.charCodeAt(0)
          return code >= 32 && code <= 126
        })
        .join('')
        .trim()

      if (cleanedBefore) {
        return cleanedBefore
      }
    }

    // Extract content between the LAST ASSISTANT markers (the actual response)
    const lastAssistantStart = text.lastIndexOf('<|BEGIN_ASSISTANT|>')
    const lastAssistantEnd = text.lastIndexOf('<|END_ASSISTANT|>')

    if (
      lastAssistantStart !== -1 &&
      lastAssistantEnd !== -1 &&
      lastAssistantEnd > lastAssistantStart
    ) {
      const assistantContent = text.slice(
        lastAssistantStart + '<|BEGIN_ASSISTANT|>'.length,
        lastAssistantEnd
      )
      const cleaned = assistantContent.trim()
      if (cleaned) {
        return cleaned
      }
    }

    // Fallback: try to find content after the last user message
    const lastUserEnd = text.lastIndexOf('<|END_USER|>')
    if (lastUserEnd !== -1) {
      const afterUser = text.slice(lastUserEnd + '<|END_USER|>'.length)
      // Remove any assistant markers and extract content
      const cleaned = afterUser
        .replace(/<\|BEGIN_ASSISTANT\|>/g, '')
        .replace(/<\|END_ASSISTANT\|>/g, '')
        .trim()
      if (cleaned) {
        return cleaned
      }
    }

    // Final fallback - clean up JSON artifacts
    const finalText = text.trim()

    // Remove empty objects and JSON artifacts
    if (finalText === '{}' || finalText === '') {
      return ''
    }

    // Remove trailing JSON artifacts like {}
    return finalText.replace(/\s*\{\}\s*$/, '').trim()
  }

  /**
   * Validate request parameters
   */
  private validateParams(params: ChatCompletionCreateParams): void {
    if (
      !params.messages ||
      !Array.isArray(params.messages) ||
      params.messages.length === 0
    ) {
      throw new BadRequestError('Messages should be a non-empty array')
    }

    if (!params.model) {
      throw new BadRequestError('Model is required')
    }

    // Validate message format
    for (const message of params.messages) {
      if (!message.role || !message.content) {
        throw new BadRequestError('Each message must have role and content')
      }

      if (!['system', 'user', 'assistant'].includes(message.role)) {
        throw new BadRequestError(
          'Message role must be system, user, or assistant'
        )
      }
    }
  }
}
