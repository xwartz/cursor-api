# Usage Examples

This document provides examples of how to use the Cursor API client in various scenarios.

## Basic Chat Completion

```typescript
import { Cursor } from 'cursor-api'

// Initialize the client
const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

// Basic chat completion
async function basicChat() {
  const completion = await cursor.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is the capital of France?' },
    ],
  })

  console.log(completion.choices[0].message.content)
}

basicChat()
```

## Streaming Response

```typescript
import { Cursor } from 'cursor-api'

const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

async function streamingChat() {
  const stream = await cursor.chat.completions.create({
    model: 'claude-4-sonnet',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      {
        role: 'user',
        content: 'Write a short story about a robot learning to paint.',
      },
    ],
    stream: true,
  })

  // Process the stream
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta.content
    if (content) process.stdout.write(content)
  }
}

streamingChat()
```

## Multi-turn Conversation

```typescript
import { Cursor } from 'cursor-api'

const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

async function conversation() {
  // First message
  const response1 = await cursor.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      {
        role: 'user',
        content: 'Hello! Can you help me learn about quantum computing?',
      },
    ],
  })

  const assistantResponse = response1.choices[0].message.content
  console.log('Assistant:', assistantResponse)

  // Follow-up question (including conversation history)
  const response2 = await cursor.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      {
        role: 'user',
        content: 'Hello! Can you help me learn about quantum computing?',
      },
      { role: 'assistant', content: assistantResponse },
      {
        role: 'user',
        content: 'What are qubits and how do they differ from classical bits?',
      },
    ],
  })

  console.log('Assistant:', response2.choices[0].message.content)
}

conversation()
```

## Error Handling

```typescript
import {
  Cursor,
  AuthenticationError,
  RateLimitError,
  APIError,
} from 'cursor-api'

const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

async function withErrorHandling() {
  try {
    const completion = await cursor.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello!' }],
    })

    console.log(completion.choices[0].message.content)
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error('Authentication failed. Please check your credentials.')
    } else if (error instanceof RateLimitError) {
      console.error('Rate limit exceeded. Please try again later.')
    } else if (error instanceof APIError) {
      console.error(`API Error: ${error.message}, Status: ${error.status}`)
    } else {
      console.error('Unexpected error:', error)
    }
  }
}

withErrorHandling()
```

## Request Configuration

```typescript
import { Cursor } from 'cursor-api'

const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

async function configuredRequest() {
  const completion = await cursor.chat.completions.create({
    model: 'claude-4-sonnet',
    messages: [{ role: 'user', content: 'Write a creative story.' }],
    // Request parameters
    temperature: 0.8, // Higher temperature for more creative output
    max_tokens: 1000, // Limit response length
    top_p: 0.95, // Nucleus sampling parameter
    frequency_penalty: 0.5, // Reduce repetition
    presence_penalty: 0.5, // Encourage topic diversity
  })

  console.log(completion.choices[0].message.content)
}

configuredRequest()
```

## Custom Client Configuration

```typescript
import { Cursor } from 'cursor-api'

// Custom client configuration
const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
  baseURL: 'https://api2.cursor.sh/v1', // Default URL
  timeout: 60000, // 60 seconds timeout
  maxRetries: 3, // Retry failed requests up to 3 times
})

async function customClientExample() {
  const completion = await cursor.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello!' }],
  })

  console.log(completion.choices[0].message.content)
}

customClientExample()
```

## Working with Different Models

```typescript
import { Cursor } from 'cursor-api'

const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

async function compareModels() {
  // Using Claude model
  const claudeResponse = await cursor.chat.completions.create({
    model: 'claude-4-sonnet',
    messages: [
      { role: 'user', content: 'Explain quantum entanglement briefly.' },
    ],
  })

  console.log('Claude response:', claudeResponse.choices[0].message.content)

  // Using GPT model
  const gptResponse = await cursor.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'user', content: 'Explain quantum entanglement briefly.' },
    ],
  })

  console.log('GPT response:', gptResponse.choices[0].message.content)
}

compareModels()
```

These examples demonstrate the core functionality of the Cursor API client. For more detailed information, refer to the [API Reference](./API_REFERENCE.md).
