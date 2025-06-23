/**
 * Cursor API SDK
 *
 * Official TypeScript SDK for Cursor API
 */

// Main client export
export { Cursor } from './client'

// Type exports
export type { ClientOptions, RequestOptions } from './types/shared'
export type {
  ChatMessage,
  ChatModel,
  ChatCompletionCreateParams,
  ChatCompletion,
  ChatCompletionChoice,
  ChatCompletionChunk,
  ChatCompletionChunkChoice,
  ChatCompletionChunkDelta,
  CompletionUsage,
  MessageRole,
} from './types/chat'

// Error exports
export {
  CursorError,
  APIError,
  BadRequestError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  RateLimitError,
  InternalServerError,
  ConnectionError,
  TimeoutError,
} from './core/errors'

// Default export
import { Cursor } from './client'
export default Cursor
