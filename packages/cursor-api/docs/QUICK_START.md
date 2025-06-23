# Quick Start Guide

This guide will help you get started with the Cursor API client.

## Installation

Install the package using npm, yarn, or pnpm:

```bash
# npm
npm install cursor-api

# yarn
yarn add cursor-api

# pnpm
pnpm add cursor-api
```

## Authentication

To use the Cursor API, you need an authentication token and checksum. You can obtain these using the `cursor-tool` tool:

```bash
# Install the CLI tool
npm install -g cursor-tool

# Extract your token and checksum
cursor-tool token
```

This will output your token and checksum, which you'll need to initialize the client.

## Basic Usage

Here's a simple example to get started:

```typescript
import { Cursor } from 'cursor-api'

// Initialize the client with your authentication details
const cursor = new Cursor({
  apiKey: 'your-cursor-session-token',
  checksum: 'your-cursor-checksum',
})

// Create a chat completion
async function main() {
  try {
    const completion = await cursor.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello, world!' }],
    })

    console.log(completion.choices[0].message.content)
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
```

## Streaming Responses

For real-time responses, use the streaming API:

```typescript
import { Cursor } from 'cursor-api'

const cursor = new Cursor({
  apiKey: 'your-cursor-session-token',
  checksum: 'your-cursor-checksum',
})

async function streamingExample() {
  try {
    const stream = await cursor.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Tell me a story' }],
      stream: true,
    })

    // Process the stream
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta.content
      if (content) process.stdout.write(content)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

streamingExample()
```

## Error Handling

The library provides detailed error types for better error handling:

```typescript
import { Cursor, APIError, AuthenticationError } from 'cursor-api'

try {
  // Your API calls
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error(
      'Authentication failed. Please check your token and checksum.'
    )
  } else if (error instanceof APIError) {
    console.error(`API Error: ${error.message}, Status: ${error.status}`)
  } else {
    console.error('Unexpected error:', error)
  }
}
```

## Next Steps

For more advanced usage, check out:

- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Authentication Guide](./AUTHENTICATION.md) - Detailed authentication information
- [Examples](./EXAMPLES.md) - More code examples
