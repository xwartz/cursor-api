/**
 * Role of the message sender
 */
export type MessageRole = 'system' | 'user' | 'assistant'

/**
 * Chat message in OpenAI format
 */
export interface ChatMessage {
  role: MessageRole
  content: string
  name?: string
}

/**
 * Supported models
 */
export type ChatModel =
  | 'claude-4-sonnet'
  | 'claude-3.7-sonnet'
  | 'claude-4-opus'
  | 'gpt-4.1'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'deepseek-r1'
  | 'deepseek-v3'
  | string

/**
 * Chat completion request parameters
 */
export interface ChatCompletionCreateParams {
  /**
   * A list of messages comprising the conversation so far
   */
  messages: ChatMessage[]

  /**
   * ID of the model to use
   */
  model: ChatModel

  /**
   * What sampling temperature to use, between 0 and 2
   * @default 1
   */
  temperature?: number

  /**
   * An alternative to sampling with temperature
   * @default 1
   */
  top_p?: number

  /**
   * The maximum number of tokens to generate
   */
  max_tokens?: number

  /**
   * Whether to stream back partial progress
   * @default false
   */
  stream?: boolean

  /**
   * Number between -2.0 and 2.0. Positive values penalize new tokens
   */
  presence_penalty?: number

  /**
   * Number between -2.0 and 2.0. Positive values penalize new tokens
   */
  frequency_penalty?: number

  /**
   * A unique identifier representing your end-user
   */
  user?: string

  /**
   * Up to 4 sequences where the API will stop generating further tokens
   */
  stop?: string | string[]
}

/**
 * Chat completion response
 */
export interface ChatCompletion {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: ChatCompletionChoice[]
  usage: CompletionUsage
}

/**
 * Chat completion choice
 */
export interface ChatCompletionChoice {
  index: number
  message: ChatMessage
  finish_reason: 'stop' | 'length' | 'content_filter' | null
  logprobs?: ChatCompletionLogprobs | null
}

/**
 * Chat completion stream chunk
 */
export interface ChatCompletionChunk {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: string
  choices: ChatCompletionChunkChoice[]
  usage?: CompletionUsage
}

/**
 * Chat completion chunk choice
 */
export interface ChatCompletionChunkChoice {
  index: number
  delta: ChatCompletionChunkDelta
  finish_reason?: 'stop' | 'length' | 'content_filter' | null
  logprobs?: ChatCompletionLogprobs | null
}

/**
 * Chat completion chunk delta
 */
export interface ChatCompletionChunkDelta {
  role?: MessageRole
  content?: string
}

/**
 * Log probabilities for completion tokens
 */
export interface ChatCompletionLogprobs {
  content: ChatCompletionTokenLogprob[] | null
}

/**
 * Token log probability
 */
export interface ChatCompletionTokenLogprob {
  token: string
  logprob: number
  bytes: number[] | null
  top_logprobs: ChatCompletionTopLogprob[]
}

/**
 * Top log probability
 */
export interface ChatCompletionTopLogprob {
  token: string
  logprob: number
  bytes: number[] | null
}

/**
 * Usage statistics for the completion request
 */
export interface CompletionUsage {
  completion_tokens: number
  prompt_tokens: number
  total_tokens: number
}
