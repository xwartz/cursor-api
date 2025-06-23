# Cursor API

TypeScript client for the Cursor API.

[![npm version](https://img.shields.io/npm/v/cursor-api.svg)](https://www.npmjs.com/package/cursor-api)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

## Features

- **Fully Typed**: Complete TypeScript definitions for all API resources
- **Modern**: Built with modern JavaScript, using Promises and async/await
- **Streaming Support**: Stream responses for real-time applications
- **Error Handling**: Detailed error types for better error handling

## Installation

```bash
# npm
npm install cursor-api

# yarn
yarn add cursor-api

# pnpm
pnpm add cursor-api
```

## Quick Start

```typescript
import { Cursor } from 'cursor-api'

// Initialize the client with your authentication details
const cursor = new Cursor({
  apiKey: 'your-cursor-session-token',
  checksum: 'your-cursor-checksum',
})

// Create a chat completion
async function main() {
  const completion = await cursor.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello, world!' }],
  })

  console.log(completion.choices[0].message.content)
}

main()
```

## Authentication

To use the Cursor API, you need an authentication token and checksum. You can obtain these using the `cursor-cli` tool:

```bash
# Install the CLI tool
npm install -g cursor-cli

# Extract your token and checksum
cursor-cli token
```

For more details, see the [Authentication Guide](./docs/AUTHENTICATION.md).

## Documentation

- [Quick Start Guide](./docs/QUICK_START.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Examples](./docs/EXAMPLES.md)
- [FAQ](./docs/FAQ.md)

## Supported Models

The API supports various models including:

- Claude models (claude-4-sonnet, claude-4-opus, claude-3.7-sonnet)
- GPT models (gpt-4o, gpt-4o-mini, gpt-4.1)
- DeepSeek models (deepseek-r1, deepseek-v3)

## License

MIT
