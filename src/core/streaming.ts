import { gunzip } from 'zlib'
import { parseHexResponse } from '../lib/protobuf'
import type { ChatCompletionChunk } from '../types/chat'

/**
 * Stream processing utilities for Cursor API responses
 */

/**
 * Process a chunk from the response stream
 */
export async function processChunk(chunk: Uint8Array): Promise<string> {
  try {
    // Check if this is a Connect protocol response with different headers
    if (chunk.length > 5) {
      let headerSize = 0
      let payload: Uint8Array

      // Check for different Connect protocol headers
      if (chunk[0] === 0x01 && chunk[1] === 0x00 && chunk[2] === 0x00) {
        // Header format: 01 00 00 04 1B [gzip data]
        headerSize = 5
      } else if (chunk[0] === 0x02 && chunk[1] === 0x00 && chunk[2] === 0x00) {
        // Header format: 02 00 00 00 02 [json data]
        headerSize = 5
      } else if (chunk[0] === 0x1f && chunk[1] === 0x8b) {
        // Direct gzip data without header
        headerSize = 0
      }

      payload = chunk.slice(headerSize)

      // Check if the payload is gzipped
      if (payload[0] === 0x1f && payload[1] === 0x8b) {
        // This is gzipped data
        try {
          const decompressed = await decompressGzipData(payload)
          const result = cleanResponseText(decompressed)
          return result
        } catch (error) {
          console.error('Gzip decompression failed:', error)
          // If gzip decompression fails, return empty string
          return ''
        }
      } else if (headerSize > 0) {
        // This is raw JSON or text data with header
        const text = Buffer.from(payload).toString('utf-8')

        // Note: {} might indicate stream end, but we'll handle this in the stream processing logic

        // Check if it's a JSON error response
        if (text.includes('{"error"')) {
          try {
            const jsonMatch = text.match(/\{[^]*?\}/)
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0])
              if (parsed.error) {
                // This is an API error response, throw it
                throw new Error(
                  `API Error: ${JSON.stringify(parsed.error) || 'Unknown error'}`
                )
              }
            }
          } catch (error) {
            if (
              error instanceof Error &&
              error.message.startsWith('API Error:')
            ) {
              throw error
            }
            // If JSON parsing fails, continue
          }
        }

        return cleanResponseText(text)
      }
    }

    // Check if this is directly gzipped data
    if (chunk[0] === 0x1f && chunk[1] === 0x8b) {
      try {
        const decompressed = await decompressGzipData(chunk)
        return cleanResponseText(decompressed)
      } catch (error) {
        console.error('Direct gzip decompression failed:', error)
        return ''
      }
    }

    // Try to parse as hex-encoded protobuf messages
    const hex = Buffer.from(chunk).toString('hex')
    const messages = parseHexResponse(hex)

    if (messages.length > 0) {
      return messages.join('')
    }

    // Fallback to raw UTF-8
    const rawText = Buffer.from(chunk).toString('utf-8')
    return cleanResponseText(rawText)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('API Error:')) {
      throw error
    }

    // If all else fails, try raw UTF-8 but clean it up
    const fallbackText = Buffer.from(chunk).toString('utf-8')

    // Remove control characters and invalid UTF-8 sequences
    return fallbackText.replace(/[\x00-\x1F\x7F-\x9F\uFFFD]/g, '').trim()
  }
}

/**
 * Decompress gzipped data
 */
function decompressGzipData(data: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    gunzip(data, (err: Error | null, decompressed: Buffer) => {
      if (err) {
        reject(err)
        return
      }
      resolve(decompressed.toString('utf-8'))
    })
  })
}

/**
 * Clean response text by removing system markers and noise
 */
function cleanResponseText(text: string): string {
  // Remove empty objects and JSON artifacts
  if (text.trim() === '{}' || text.trim() === '') {
    return ''
  }

  // Remove system prompts and other noise
  const systemPromptRegex =
    /<\|BEGIN_SYSTEM\|>.*?<\|END_SYSTEM\|>.*?<\|BEGIN_USER\|>.*?<\|END_USER\|>/s
  if (systemPromptRegex.test(text)) {
    return ''
  }

  // Remove system markers and clean up
  text = text.replace(/^.*<\|END_USER\|>/s, '')
  text = text.replace(/^\n[a-zA-Z]?/, '').trim()

  // Remove trailing JSON artifacts like {}
  text = text.replace(/\s*\{\}\s*$/, '').trim()

  return text
}

/**
 * Create a readable stream from response chunks
 */
export class CursorStream {
  private reader: ReadableStreamDefaultReader<Uint8Array>
  private controller: ReadableStreamDefaultController<ChatCompletionChunk>
  private responseId: string
  private model: string
  private done = false
  private lastActivity = Date.now()
  private readonly idleTimeout = 10000 // 10 seconds of inactivity
  private chunkCount = 0
  private emptyChunkCount = 0

  constructor(response: Response, responseId: string, model: string) {
    if (!response.body) {
      throw new Error('Response body is null')
    }

    this.reader = response.body.getReader()
    this.responseId = responseId
    this.model = model
    this.controller =
      null as unknown as ReadableStreamDefaultController<ChatCompletionChunk>
  }

  /**
   * Create a readable stream of completion chunks
   */
  toStream(): ReadableStream<ChatCompletionChunk> {
    return new ReadableStream<ChatCompletionChunk>({
      start: (
        controller: ReadableStreamDefaultController<ChatCompletionChunk>
      ) => {
        this.controller = controller
      },
      pull: async () => {
        try {
          // If already done, close the stream
          if (this.done) {
            this.controller.close()
            return
          }

          // Read from the stream with a shorter timeout for better responsiveness
          const shortTimeout = 5000 // 5 seconds
          const timeoutPromise = new Promise<{ done: true; value: undefined }>(
            resolve => {
              setTimeout(() => {
                resolve({ done: true, value: undefined })
              }, shortTimeout)
            }
          )

          const result = await Promise.race([
            this.reader.read(),
            timeoutPromise,
          ])

          // If the reader indicates completion
          if (result.done) {
            if (!this.done) {
              this.enqueueFinalChunk()
              this.done = true
            }
            this.controller.close()
            return
          }

          const value = result.value
          if (!value) {
            // This was a timeout - check if we should end the stream
            const timeSinceLastActivity = Date.now() - this.lastActivity

            // If we've received data and had no activity for a while, end the stream
            if (
              this.chunkCount > 0 &&
              timeSinceLastActivity > this.idleTimeout
            ) {
              if (!this.done) {
                this.enqueueFinalChunk()
                this.done = true
              }
              this.controller.close()
              return
            }

            // Otherwise continue waiting
            return
          }

          // Update last activity time
          this.lastActivity = Date.now()

          // Process the chunk
          const text = await processChunk(value)

          // Check for end-of-stream marker in streaming context
          // Look for {} in the raw payload data which indicates end of stream
          if (
            value.length >= 5 &&
            value[0] === 0x02 &&
            value[1] === 0x00 &&
            value[2] === 0x00
          ) {
            const payload = value.slice(5)
            const rawText = Buffer.from(payload).toString('utf-8')
            if (rawText.trim() === '{}') {
              if (!this.done) {
                this.enqueueFinalChunk()
                this.done = true
              }
              this.controller.close()
              return
            }
          }

          // If we get empty text, increment empty chunk counter
          if (text.length === 0) {
            this.emptyChunkCount++

            // If we've received actual content before and now getting multiple empty chunks,
            // this might indicate end of stream
            if (this.chunkCount > 0 && this.emptyChunkCount >= 2) {
              if (!this.done) {
                this.enqueueFinalChunk()
                this.done = true
              }
              this.controller.close()
              return
            }

            // For very small chunks (might be connection artifacts), wait a bit
            if (value.length <= 5) {
              await new Promise(resolve => setTimeout(resolve, 50))
            }

            return
          }

          // Reset empty chunk counter when we get actual content
          this.emptyChunkCount = 0

          // Enqueue the chunk with content
          this.enqueueChunk(text)
          this.chunkCount++
        } catch (error) {
          this.controller.error(error)
        }
      },
      cancel: () => {
        return this.reader.cancel()
      },
    })
  }

  /**
   * Enqueue a completion chunk
   */
  private enqueueChunk(content: string): void {
    const chunk: ChatCompletionChunk = {
      id: this.responseId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: this.model,
      choices: [
        {
          index: 0,
          delta: {
            content,
          },
        },
      ],
    }

    this.controller.enqueue(chunk)
  }

  /**
   * Enqueue the final chunk to signal completion
   */
  private enqueueFinalChunk(): void {
    const chunk: ChatCompletionChunk = {
      id: this.responseId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: this.model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
    }

    this.controller.enqueue(chunk)
  }

  /**
   * Convert stream to async iterator
   */
  async *[Symbol.asyncIterator](): AsyncIterator<ChatCompletionChunk> {
    const stream = this.toStream()
    const reader = stream.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        yield value
      }
    } finally {
      reader.releaseLock()
    }
  }
}
