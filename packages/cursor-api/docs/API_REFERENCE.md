# API Reference

Complete API documentation for the Cursor API SDK.

## Table of Contents

- [Client Configuration](#client-configuration)
- [Chat Completions](#chat-completions)
- [Types](#types)
- [Error Handling](#error-handling)
- [Request Options](#request-options)

## Client Configuration

### Constructor

```typescript
new Cursor(options: ClientOptions)
```

Creates a new Cursor API client instance.

#### ClientOptions

| Option           | Type                     | Required | Default                  | Description                 |
| ---------------- | ------------------------ | -------- | ------------------------ | --------------------------- |
| `apiKey`         | `string`                 | ✅       | -                        | Cursor session token        |
| `checksum`       | `string`                 | ✅       | -                        | Request validation checksum |
| `baseURL`        | `string`                 | ❌       | `https://api2.cursor.sh` | API base URL                |
| `timeout`        | `number`                 | ❌       | `60000`                  | Request timeout (ms)        |
| `maxRetries`     | `number`                 | ❌       | `2`                      | Maximum retry attempts      |
| `defaultHeaders` | `Record<string, string>` | ❌       | `{}`                     | Default request headers     |
| `fetch`          | `typeof fetch`           | ❌       | `globalThis.fetch`       | Custom fetch implementation |

#### Example

```typescript
import { Cursor } from 'cursor-api'

const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
  timeout: 30000,
  maxRetries: 3,
  defaultHeaders: {
    'User-Agent': 'MyApp/1.0.0',
  },
})
```

### Static Methods

#### `Cursor.create(options: ClientOptions): Cursor`

Alternative way to create a client instance.

```typescript
const cursor = Cursor.create({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})
```

## Chat Completions

### `cursor.chat.completions.create`

Creates a chat completion request.

#### Method Signatures

```typescript
// Non-streaming completion
create(params: ChatCompletionCreateParams): Promise<ChatCompletion>

// Streaming completion
create(
  params: ChatCompletionCreateParams & { stream: true }
): Promise<ReadableStream<ChatCompletionChunk>>

// With request options
create(
  params: ChatCompletionCreateParams,
  options?: RequestOptions
): Promise<ChatCompletion | ReadableStream<ChatCompletionChunk>>
```

#### Parameters

##### ChatCompletionCreateParams

| Parameter           | Type                 | Required | Default | Description                 |
| ------------------- | -------------------- | -------- | ------- | --------------------------- |
| `model`             | `ChatModel`          | ✅       | -       | Model name to use           |
| `messages`          | `ChatMessage[]`      | ✅       | -       | Conversation messages       |
| `temperature`       | `number`             | ❌       | `1`     | Sampling temperature (0-2)  |
| `max_tokens`        | `number`             | ❌       | -       | Maximum tokens to generate  |
| `top_p`             | `number`             | ❌       | `1`     | Nucleus sampling parameter  |
| `stream`            | `boolean`            | ❌       | `false` | Enable streaming            |
| `presence_penalty`  | `number`             | ❌       | `0`     | Presence penalty (-2 to 2)  |
| `frequency_penalty` | `number`             | ❌       | `0`     | Frequency penalty (-2 to 2) |
| `user`              | `string`             | ❌       | -       | End-user identifier         |
| `stop`              | `string \| string[]` | ❌       | -       | Stop sequences              |

#### Examples

##### Basic Chat Completion

```typescript
const completion = await cursor.chat.completions.create({
  model: 'claude-4-sonnet',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain machine learning in simple terms' },
  ],
  temperature: 0.7,
  max_tokens: 500,
})

console.log(completion.choices[0].message.content)
```

##### Streaming Chat Completion

```typescript
const stream = await cursor.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Write a short story' }],
  stream: true,
  max_tokens: 1000,
})

// Using async iterator
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content
  if (content) {
    process.stdout.write(content)
  }
}
```

##### Advanced Configuration

````typescript
const completion = await cursor.chat.completions.create(
  {
    model: 'claude-4-opus',
    messages: [
      { role: 'system', content: 'You are a code review assistant.' },
      { role: 'user', content: 'Review this TypeScript function...' },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    presence_penalty: 0.1,
    frequency_penalty: 0.1,
    stop: ['```', 'END_REVIEW'],
  },
  {
    timeout: 45000,
    headers: {
      'X-Request-ID': 'review-123',
    },
  }
)
````

## Types

### ChatMessage

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  name?: string
}
```

### ChatModel

```typescript
type ChatModel =
  | 'claude-4-sonnet'
  | 'claude-3.7-sonnet'
  | 'claude-4-opus'
  | 'gpt-4.1'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'deepseek-r1'
  | 'deepseek-v3'
  | string
```

### ChatCompletion

```typescript
interface ChatCompletion {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: ChatCompletionChoice[]
  usage: CompletionUsage
}

interface ChatCompletionChoice {
  index: number
  message: ChatMessage
  finish_reason: 'stop' | 'length' | 'content_filter' | null
}

interface CompletionUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}
```

### ChatCompletionChunk (Streaming)

```typescript
interface ChatCompletionChunk {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: string
  choices: ChatCompletionChunkChoice[]
  usage?: CompletionUsage
}

interface ChatCompletionChunkChoice {
  index: number
  delta: {
    role?: 'assistant'
    content?: string
  }
  finish_reason?: 'stop' | 'length' | 'content_filter' | null
}
```

## Error Handling

### Error Types

```typescript
// Base error class
class CursorError extends Error {
  abstract readonly name: string
  abstract readonly status: number | undefined
}

// Specific error types
class AuthenticationError extends CursorError // 401
class BadRequestError extends CursorError     // 400
class RateLimitError extends CursorError      // 429
class InternalServerError extends CursorError // 5xx
class ConnectionError extends CursorError     // Network issues
class TimeoutError extends CursorError        // Request timeout
```

### Error Handling Examples

```typescript
import {
  AuthenticationError,
  RateLimitError,
  BadRequestError,
  TimeoutError,
} from 'cursor-api'

try {
  const completion = await cursor.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }],
  })
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message)
    // Handle invalid credentials
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded:', error.message)
    // Implement backoff strategy
  } else if (error instanceof BadRequestError) {
    console.error('Invalid request:', error.message)
    // Fix request parameters
  } else if (error instanceof TimeoutError) {
    console.error('Request timed out:', error.message)
    // Retry or increase timeout
  } else {
    console.error('Unexpected error:', error)
  }
}
```

## Request Options

### RequestOptions Interface

```typescript
interface RequestOptions {
  timeout?: number // Request timeout (ms)
  headers?: Record<string, string> // Additional headers
  signal?: AbortSignal // Abort signal
}
```

### Usage Examples

#### Custom Timeout

```typescript
const completion = await cursor.chat.completions.create(
  {
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Complex question...' }],
  },
  {
    timeout: 120000, // 2 minutes
  }
)
```

#### Custom Headers

```typescript
const completion = await cursor.chat.completions.create(
  {
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }],
  },
  {
    headers: {
      'X-Request-ID': 'req-123',
      'X-User-ID': 'user-456',
    },
  }
)
```

#### Request Cancellation

```typescript
const controller = new AbortController()

// Cancel after 30 seconds
setTimeout(() => controller.abort(), 30000)

try {
  const completion = await cursor.chat.completions.create(
    {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Long task...' }],
    },
    {
      signal: controller.signal,
    }
  )
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled')
  }
}
```

## Model Capabilities

| Model               | Max Tokens | Streaming | Best For                     |
| ------------------- | ---------- | --------- | ---------------------------- |
| `claude-4-sonnet`   | 200,000    | ✅        | Advanced reasoning, analysis |
| `claude-3.7-sonnet` | 200,000    | ✅        | Balanced performance         |
| `claude-4-opus`     | 200,000    | ✅        | Most capable Claude model    |
| `gpt-4.1`           | 128,000    | ✅        | Latest GPT-4 variant         |
| `gpt-4o`            | 128,000    | ✅        | Optimized performance        |
| `gpt-4o-mini`       | 128,000    | ✅        | Cost-effective tasks         |
| `deepseek-r1`       | 65,536     | ✅        | Reasoning and mathematics    |
| `deepseek-v3`       | 65,536     | ✅        | General purpose tasks        |

## Best Practices

### 1. Model Selection

```typescript
// For code tasks
const codeCompletion = await cursor.chat.completions.create({
  model: 'claude-4-opus',
  messages: [{ role: 'user', content: 'Write a React component...' }],
})

// For reasoning tasks
const reasoning = await cursor.chat.completions.create({
  model: 'deepseek-r1',
  messages: [{ role: 'user', content: 'Solve this complex problem...' }],
})
```

### 2. Streaming for UX

```typescript
// Use streaming for better user experience
if (expectedResponseLength > 100) {
  const stream = await cursor.chat.completions.create({
    model: 'gpt-4o',
    messages: messages,
    stream: true,
  })

  for await (const chunk of stream) {
    // Update UI incrementally
    updateUI(chunk.choices[0]?.delta?.content)
  }
}
```

### 3. Error Recovery

```typescript
async function createCompletionWithRetry(params: ChatCompletionCreateParams) {
  let retries = 3

  while (retries > 0) {
    try {
      return await cursor.chat.completions.create(params)
    } catch (error) {
      if (error instanceof RateLimitError && retries > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)))
        retries--
        continue
      }
      throw error
    }
  }
}
```
