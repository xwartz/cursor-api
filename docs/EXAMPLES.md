# Usage Examples

Practical examples for integrating the Cursor API SDK into real-world applications.

## 📝 Table of Contents

- [Web Applications](#web-applications)
- [CLI Tools](#cli-tools)
- [Code Generation](#code-generation)
- [Streaming Applications](#streaming-applications)
- [Error Recovery](#error-recovery)
- [Production Patterns](#production-patterns)

## Web Applications

### Express.js API Server

```typescript
import express from 'express'
import { Cursor, AuthenticationError, RateLimitError } from 'cursor-api'

const app = express()
app.use(express.json())

const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

app.post('/api/chat', async (req, res) => {
  try {
    const { message, model = 'gpt-4o' } = req.body

    const completion = await cursor.chat.completions.create({
      model,
      messages: [{ role: 'user', content: message }],
      max_tokens: 1000,
    }, {
      timeout: 30000,
    })

    res.json({
      success: true,
      response: completion.choices[0].message.content,
      model: completion.model,
    })
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({ error: 'Invalid API credentials' })
    } else if (error instanceof RateLimitError) {
      res.status(429).json({ error: 'Rate limit exceeded' })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

app.get('/api/chat/stream', async (req, res) => {
  const { message } = req.query

  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Transfer-Encoding', 'chunked')

  try {
    const stream = await cursor.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: message as string }],
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta.content
      if (content) {
        res.write(content)
      }
    }
    res.end()
  } catch (error) {
    res.write(`Error: ${error.message}`)
    res.end()
  }
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

### Next.js API Route

```typescript
// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Cursor } from 'cursor-api'

const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, stream = false } = req.body

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/plain')
      res.setHeader('Cache-Control', 'no-cache')

      const streamResponse = await cursor.chat.completions.create({
        model: 'gpt-4o',
        messages,
        stream: true,
      })

      for await (const chunk of streamResponse) {
        const content = chunk.choices[0]?.delta.content
        if (content) {
          res.write(content)
        }
      }
      res.end()
    } else {
      const completion = await cursor.chat.completions.create({
        model: 'claude-4-sonnet',
        messages,
      })

      res.json({
        message: completion.choices[0].message.content,
        usage: completion.usage,
      })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
```

## CLI Tools

### Interactive Chat CLI

```typescript
#!/usr/bin/env node
import readline from 'readline'
import { Cursor } from 'cursor-api'

const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const messages: Array<{ role: string; content: string }> = []

async function chat() {
  console.log('🤖 Cursor Chat CLI - Type "exit" to quit\n')

  while (true) {
    const userInput = await new Promise<string>((resolve) => {
      rl.question('You: ', resolve)
    })

    if (userInput.toLowerCase() === 'exit') {
      break
    }

    messages.push({ role: 'user', content: userInput })

    try {
      process.stdout.write('Assistant: ')

      const stream = await cursor.chat.completions.create({
        model: 'gpt-4o',
        messages,
        stream: true,
      })

      let response = ''
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta.content
        if (content) {
          response += content
          process.stdout.write(content)
        }
      }

      console.log('\n')
      messages.push({ role: 'assistant', content: response })
    } catch (error) {
      console.error('\n❌ Error:', error.message)
    }
  }

  rl.close()
}

chat()
```

### Code Review CLI

```typescript
#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { Cursor } from 'cursor-api'

const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

async function reviewCode(filePath: string) {
  try {
    const code = fs.readFileSync(filePath, 'utf-8')
    const extension = path.extname(filePath)

    const completion = await cursor.chat.completions.create({
      model: 'claude-4-opus',
      messages: [
        {
          role: 'system',
          content: 'You are an expert code reviewer. Provide constructive feedback on code quality, potential bugs, and improvements.'
        },
        {
          role: 'user',
          content: `Please review this ${extension} file:\n\n\`\`\`${extension}\n${code}\n\`\`\``
        }
      ],
      temperature: 0.3,
    })

    console.log(`📝 Code Review for ${filePath}`)
    console.log('=' .repeat(50))
    console.log(completion.choices[0].message.content)
  } catch (error) {
    console.error('❌ Review failed:', error.message)
  }
}

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: code-review <file-path>')
  process.exit(1)
}

reviewCode(filePath)
```

## Code Generation

### Component Generator

```typescript
import { Cursor } from 'cursor-api'
import fs from 'fs/promises'
import path from 'path'

const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

interface ComponentSpec {
  name: string
  props: Record<string, string>
  functionality: string
  styling: 'tailwind' | 'styled-components' | 'css-modules'
}

async function generateReactComponent(spec: ComponentSpec) {
  const prompt = `Generate a React TypeScript component with these specifications:

Component Name: ${spec.name}
Props: ${JSON.stringify(spec.props, null, 2)}
Functionality: ${spec.functionality}
Styling: ${spec.styling}

Requirements:
- Use TypeScript with proper interfaces
- Include JSDoc comments
- Follow React best practices
- Make it production-ready
- Include proper error handling`

  try {
    const completion = await cursor.chat.completions.create({
      model: 'claude-4-opus',
      messages: [
        { role: 'system', content: 'You are an expert React developer.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
    })

    const code = completion.choices[0].message.content
    const fileName = `${spec.name}.tsx`

    await fs.writeFile(fileName, code)
    console.log(`✅ Generated ${fileName}`)

    return code
  } catch (error) {
    console.error('❌ Generation failed:', error.message)
    throw error
  }
}

// Usage
generateReactComponent({
  name: 'UserProfile',
  props: {
    user: 'User',
    onEdit: '() => void',
    isEditable: 'boolean'
  },
  functionality: 'Display user information with edit capabilities',
  styling: 'tailwind'
})
```

### API Documentation Generator

```typescript
import { Cursor } from 'cursor-api'

async function generateAPIDoc(openApiSpec: object) {
  const completion = await cursor.chat.completions.create({
    model: 'claude-4-sonnet',
    messages: [
      {
        role: 'system',
        content: 'Generate comprehensive API documentation from OpenAPI specifications.'
      },
      {
        role: 'user',
        content: `Create detailed API documentation for this OpenAPI spec:\n\n${JSON.stringify(openApiSpec, null, 2)}`
      }
    ],
    temperature: 0.1,
  })

  return completion.choices[0].message.content
}
```

## Streaming Applications

### Real-time Code Assistant

```typescript
import { Cursor } from 'cursor-api'
import { EventEmitter } from 'events'

class CodeAssistant extends EventEmitter {
  private cursor: Cursor
  private context: Array<{ role: string; content: string }> = []

  constructor() {
    super()
    this.cursor = new Cursor({
      apiKey: process.env.CURSOR_API_KEY!,
      checksum: process.env.CURSOR_CHECKSUM!,
    })
  }

  async analyzeCode(code: string, language: string) {
    const prompt = `Analyze this ${language} code and provide suggestions:\n\n\`\`\`${language}\n${code}\n\`\`\``

    this.context.push({ role: 'user', content: prompt })

    try {
      const stream = await this.cursor.chat.completions.create({
        model: 'claude-4-opus',
        messages: this.context,
        stream: true,
        temperature: 0.3,
      })

      let response = ''
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta.content
        if (content) {
          response += content
          this.emit('chunk', content)
        }
      }

      this.context.push({ role: 'assistant', content: response })
      this.emit('complete', response)

      return response
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  clearContext() {
    this.context = []
  }
}

// Usage
const assistant = new CodeAssistant()

assistant.on('chunk', (content) => {
  process.stdout.write(content)
})

assistant.on('complete', (response) => {
  console.log('\n✅ Analysis complete')
})

assistant.on('error', (error) => {
  console.error('❌ Error:', error.message)
})

// Analyze some code
assistant.analyzeCode(`
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
`, 'javascript')
```

## Error Recovery

### Retry with Exponential Backoff

```typescript
import { Cursor, RateLimitError, ConnectionError } from 'cursor-api'

class ResilientCursorClient {
  private cursor: Cursor
  private maxRetries = 3
  private baseDelay = 1000

  constructor(options: { apiKey: string; checksum: string }) {
    this.cursor = new Cursor(options)
  }

  async createCompletionWithRetry(params: any, attempt = 1): Promise<any> {
    try {
      return await this.cursor.chat.completions.create(params)
    } catch (error) {
      if (attempt >= this.maxRetries) {
        throw error
      }

      if (error instanceof RateLimitError || error instanceof ConnectionError) {
        const delay = this.baseDelay * Math.pow(2, attempt - 1)
        console.log(`Retry attempt ${attempt} after ${delay}ms...`)

        await new Promise(resolve => setTimeout(resolve, delay))
        return this.createCompletionWithRetry(params, attempt + 1)
      }

      throw error
    }
  }
}

// Usage
const resilientClient = new ResilientCursorClient({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

resilientClient.createCompletionWithRetry({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }]
})
```

## Production Patterns

### Request Queue with Rate Limiting

```typescript
import { Cursor } from 'cursor-api'

class CursorQueue {
  private cursor: Cursor
  private queue: Array<() => Promise<void>> = []
  private processing = false
  private requestsPerMinute = 20
  private requestCount = 0
  private windowStart = Date.now()

  constructor(options: { apiKey: string; checksum: string }) {
    this.cursor = new Cursor(options)
  }

  async enqueue<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      // Rate limiting check
      const now = Date.now()
      if (now - this.windowStart >= 60000) {
        this.requestCount = 0
        this.windowStart = now
      }

      if (this.requestCount >= this.requestsPerMinute) {
        const waitTime = 60000 - (now - this.windowStart)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }

      const request = this.queue.shift()!
      this.requestCount++

      try {
        await request()
      } catch (error) {
        console.error('Request failed:', error.message)
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    this.processing = false
  }

  async createCompletion(params: any) {
    return this.enqueue(() => this.cursor.chat.completions.create(params))
  }
}

// Usage
const queue = new CursorQueue({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

// Multiple requests will be queued and rate-limited
Promise.all([
  queue.createCompletion({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hello 1' }] }),
  queue.createCompletion({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hello 2' }] }),
  queue.createCompletion({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hello 3' }] }),
])
```

### Caching Layer

```typescript
import { Cursor } from 'cursor-api'
import crypto from 'crypto'

interface CacheEntry {
  response: any
  timestamp: number
  ttl: number
}

class CachedCursorClient {
  private cursor: Cursor
  private cache = new Map<string, CacheEntry>()
  private defaultTTL = 300000 // 5 minutes

  constructor(options: { apiKey: string; checksum: string }) {
    this.cursor = new Cursor(options)
  }

  private getCacheKey(params: any): string {
    return crypto.createHash('md5').update(JSON.stringify(params)).digest('hex')
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  async createCompletion(params: any, cacheTTL = this.defaultTTL) {
    const cacheKey = this.getCacheKey(params)
    const cached = this.cache.get(cacheKey)

    if (cached && !this.isExpired(cached)) {
      console.log('Cache hit')
      return cached.response
    }

    console.log('Cache miss - making API request')
    const response = await this.cursor.chat.completions.create(params)

    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      ttl: cacheTTL,
    })

    return response
  }

  clearCache() {
    this.cache.clear()
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    }
  }
}

// Usage
const cachedClient = new CachedCursorClient({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

// First call hits API
await cachedClient.createCompletion({
  model: 'claude-4-sonnet',
  messages: [{ role: 'user', content: 'What is TypeScript?' }]
})

// Second identical call hits cache
await cachedClient.createCompletion({
  model: 'claude-4-sonnet',
  messages: [{ role: 'user', content: 'What is TypeScript?' }]
})
```

These examples demonstrate practical, production-ready patterns for integrating the Cursor API SDK into real applications. Each example includes proper error handling, performance considerations, and best practices for different use cases.

