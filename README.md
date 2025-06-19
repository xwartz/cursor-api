# Cursor API SDK

[![npm version](https://badge.fury.io/js/cursor-api.svg)](https://badge.fury.io/js/cursor-api)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![CI](https://github.com/xwartz/cursor-api/workflows/CI/badge.svg)](https://github.com/xwartz/cursor-api/actions)
[![codecov](https://codecov.io/gh/xwartz/cursor-api/graph/badge.svg?token=FKF3XOSSR2)](https://codecov.io/gh/xwartz/cursor-api)

TypeScript SDK for Cursor API, providing seamless integration with Cursor's AI capabilities.

## Features

- 🔥 **Full TypeScript Support** - Complete type safety and excellent developer experience
- 🚀 **OpenAI Compatible** - Drop-in replacement for OpenAI SDK in most cases
- 📡 **Streaming Support** - Real-time streaming responses with async iterators
- 🔄 **Automatic Retries** - Built-in retry logic with exponential backoff
- 🔐 **Secure Authentication** - API key and checksum-based authentication
- 🧪 **Comprehensive Testing** - 100% test coverage with Jest
- 📦 **Modern ESM/CJS** - Supports both ESM and CommonJS

## Quick Start

### Installation

```bash
npm install cursor-api
```

### Basic Usage

```typescript
import { Cursor } from 'cursor-api'

const cursor = new Cursor({
  apiKey: 'your-cursor-session-token',
  checksum: 'your-cursor-checksum',
})

const completion = await cursor.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
})
```

### Streaming

```typescript
const stream = await cursor.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true,
})

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta.content
  if (content) process.stdout.write(content)
}
```

## Documentation

- 📚 [Quick Start Guide](./docs/QUICK_START.md) - Get up and running in 5 minutes
- 🔐 [Authentication Guide](./docs/AUTHENTICATION.md) - How to extract credentials from Cursor IDE
- 📖 [API Reference](./docs/API_REFERENCE.md) - Complete API documentation
- 💡 [Examples](./docs/EXAMPLES.md) - Code examples and integration patterns
- ❓ [FAQ](./docs/FAQ.md) - Frequently asked questions and troubleshooting
- 🧪 [Verification Guide](./docs/VERIFICATION.md) - Testing and debugging tools
- 👥 [Contributing](./CONTRIBUTING.md) - Development and contribution guidelines

## Supported Models

| Model                                                   | Streaming | Description             |
| ------------------------------------------------------- | --------- | ----------------------- |
| `claude-4-sonnet`, `claude-3.7-sonnet`, `claude-4-opus` | ✅         | Anthropic Claude models |
| `gpt-4.1`, `gpt-4o`, `gpt-4o-mini`                      | ✅         | OpenAI GPT models       |
| `deepseek-r1`, `deepseek-v3`                            | ✅         | DeepSeek models         |

## Error Handling

```typescript
import { AuthenticationError, RateLimitError } from 'cursor-api';

try {
  const completion = await cursor.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }],
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid credentials');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded');
  }
}
```

## Development

```bash
git clone https://github.com/xwartz/cursor-api.git
cd cursor-api
npm install
npm run build
npm test
```

**Requirements:**
- Node.js 18+
- TypeScript 5.6+
- ESLint 9.0+ (flat config)

**Key Scripts:**
- `npm run build` - Build the project
- `npm run test` - Run tests
- `npm run lint` - Check code style
- `npm run format` - Format code with Prettier

## Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📖 [Documentation](./docs/README.md)
- 🐛 [Issues](https://github.com/xwartz/cursor-api/issues)
- 💬 [Discussions](https://github.com/xwartz/cursor-api/discussions)

---

Made with ❤️ by xwartz
