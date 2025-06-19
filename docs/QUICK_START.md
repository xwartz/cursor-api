# Quick Start Guide

Get up and running with the Cursor API SDK in under 5 minutes.

## 🚀 Quick Setup

### 1. Installation

```bash
npm install cursor-api
```

### 2. Extract Your Credentials

You need to extract API credentials from Cursor IDE using network interception tools.

**Quick Method - Using Charles Proxy:**

1. **Install Charles Proxy** from [charlesproxy.com](https://charlesproxy.com)
2. **Configure Cursor IDE proxy** to `127.0.0.1:8888`
3. **Start recording** in Charles
4. **Make a chat request** in Cursor IDE
5. **Find the request** to `api2.cursor.sh`
6. **Extract from headers:**
   - `Authorization: Bearer [YOUR_API_KEY]`
   - `x-cursor-checksum: [YOUR_CHECKSUM]`

> **Need detailed instructions?** See the [Authentication Guide](./AUTHENTICATION.md)

### 3. Basic Usage

```typescript
import { Cursor } from 'cursor-api'

const cursor = new Cursor({
  apiKey: 'your-extracted-api-key',
  checksum: 'your-extracted-checksum',
})

// Send a chat message
const response = await cursor.chat.completions.create({
  model: 'claude-4-sonnet',
  messages: [
    { role: 'user', content: 'Hello! How are you?' }
  ],
})

console.log(response.choices[0].message.content)
```

### 4. Streaming Response

```typescript
const stream = await cursor.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: 'Tell me a story' }
  ],
  stream: true,
})

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta.content
  if (content) {
    process.stdout.write(content)
  }
}
```

## 🔧 Environment Configuration

For security, use environment variables:

```bash
# .env file
CURSOR_API_KEY=your-extracted-api-key
CURSOR_CHECKSUM=your-extracted-checksum
```

```typescript
const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})
```

## 📝 Supported Models

| Model               | Description               | Streaming |
| ------------------- | ------------------------- | --------- |
| `claude-4-sonnet`   | Advanced Claude model     | ✅         |
| `claude-3.7-sonnet` | Balanced Claude model     | ✅         |
| `claude-4-opus`     | Most capable Claude model | ✅         |
| `gpt-4.1`           | Latest GPT-4 variant      | ✅         |
| `gpt-4o`            | Optimized GPT-4           | ✅         |
| `gpt-4o-mini`       | Lightweight GPT-4         | ✅         |
| `deepseek-r1`       | DeepSeek reasoning model  | ✅         |
| `deepseek-v3`       | DeepSeek general model    | ✅         |

## ❌ Error Handling

```typescript
import { AuthenticationError, RateLimitError } from 'cursor-api'

try {
  const response = await cursor.chat.completions.create({
    model: 'claude-4-sonnet',
    messages: [{ role: 'user', content: 'Hello' }],
  })
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed - check your credentials')
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded - please try again later')
  } else {
    console.error('Request failed:', error.message)
  }
}
```

## 🛠️ Debug Tools

If you encounter issues, use the built-in debug tools:

```bash
# Set environment variables
export CURSOR_API_KEY="your-api-key"
export CURSOR_CHECKSUM="your-checksum"

# Run debug script
npm run debug
```

## 📚 Next Steps

- [Complete API Documentation](./API_REFERENCE.md)
- [Authentication Guide](./AUTHENTICATION.md)
- [Usage Examples](./EXAMPLES.md)
- [Frequently Asked Questions](./FAQ.md)

## 💡 Best Practices

### 1. Always Handle Errors
```typescript
try {
  const response = await cursor.chat.completions.create(params)
  // Handle success
} catch (error) {
  // Handle errors
}
```

### 2. Use Streaming for Long Responses
```typescript
if (expectLongResponse) {
  const stream = await cursor.chat.completions.create({
    ...params,
    stream: true,
  })
  // Process stream
}
```

### 3. Configure Request Parameters
```typescript
const response = await cursor.chat.completions.create({
  model: 'claude-4-sonnet',
  messages: messages,
  temperature: 0.7,     // Control creativity
  max_tokens: 1000,     // Limit response length
  timeout: 30000,       // Set timeout
})
```

### 4. Secure Your Credentials
```typescript
// ✅ Good
const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

// ❌ Avoid
const cursor = new Cursor({
  apiKey: 'hardcoded-key', // Never hardcode credentials
  checksum: 'hardcoded-checksum',
})
```

You're now ready to start building with the Cursor API SDK! 🎉

## 🆘 Need Help?

- **Authentication issues?** See [Authentication Guide](./AUTHENTICATION.md)
- **API questions?** Check [API Reference](./API_REFERENCE.md)
- **Common problems?** Browse [FAQ](./FAQ.md)
- **Still stuck?** Create an issue on GitHub
