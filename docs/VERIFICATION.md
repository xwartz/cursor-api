# Verification Guide

Essential tools and scripts to verify your Cursor API SDK setup and troubleshoot issues.

## 🚀 Quick Verification

### Built-in Debug Script

```bash
export CURSOR_API_KEY="your-extracted-api-key"
export CURSOR_CHECKSUM="your-extracted-checksum"
npm run debug
```

**Expected Output:**
```
✅ Credentials loaded successfully
🔗 Testing connection to api2.cursor.sh...
✅ Connection successful
🤖 Testing chat completion...
✅ Chat completion successful

All tests passed! Your setup is working correctly.
```

### Manual Test Script

```typescript
// verify.ts
import { Cursor, AuthenticationError } from 'cursor-api'

async function verify() {
  if (!process.env.CURSOR_API_KEY || !process.env.CURSOR_CHECKSUM) {
    console.error('❌ Missing credentials in environment variables')
    return false
  }

  const cursor = new Cursor({
    apiKey: process.env.CURSOR_API_KEY,
    checksum: process.env.CURSOR_CHECKSUM,
  })

  try {
    const response = await cursor.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Test' }],
      max_tokens: 5,
    })

    console.log('✅ API working:', response.choices[0].message.content)
    return true
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error('❌ Invalid/expired credentials')
    } else {
      console.error('❌ Request failed:', error.message)
    }
    return false
  }
}

verify()
```

## 🔍 Credential Validation

### Format Checker

```typescript
function validateCredentials(apiKey: string, checksum: string): boolean {
  if (!apiKey || apiKey.length < 10) {
    console.error('❌ Invalid API key format')
    return false
  }

  if (!checksum || !checksum.startsWith('zo') || checksum.length < 70) {
    console.error('❌ Invalid checksum format (should start with "zo")')
    return false
  }

  console.log('✅ Credential format valid')
  return true
}
```

### Freshness Test

```typescript
async function testCredentialFreshness(): Promise<boolean> {
  try {
    const cursor = new Cursor({
      apiKey: process.env.CURSOR_API_KEY!,
      checksum: process.env.CURSOR_CHECKSUM!,
    })

    await cursor.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
    })

    console.log('✅ Credentials are fresh')
    return true
  } catch (error) {
    console.log('❌ Credentials expired or invalid')
    return false
  }
}
```

## 🌐 Network Diagnostics

### Connectivity Test

```typescript
async function testConnectivity(): Promise<boolean> {
  try {
    // Test DNS resolution
    const dns = await import('dns').then(m => m.promises)
    await dns.resolve('api2.cursor.sh')
    console.log('✅ DNS resolution successful')

    // Test HTTP connectivity
    const response = await fetch('https://api2.cursor.sh', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    console.log('✅ HTTP connectivity successful')
    return true
  } catch (error) {
    console.error('❌ Network connectivity failed:', error.message)
    return false
  }
}
```

### Proxy Detection

```typescript
function detectProxy(): void {
  const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']
  const activeProxies = proxyVars.filter(v => process.env[v])

  if (activeProxies.length > 0) {
    console.log('🔍 Proxy detected:', activeProxies.map(v => `${v}=${process.env[v]}`))
  } else {
    console.log('ℹ️  No proxy environment variables detected')
  }
}
```

## 🧪 Model Testing

### Test All Models

```typescript
async function testModels() {
  const cursor = new Cursor({
    apiKey: process.env.CURSOR_API_KEY!,
    checksum: process.env.CURSOR_CHECKSUM!,
  })

  const models = [
    'gpt-4o-mini',
    'gpt-4',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022'
  ]

  for (const model of models) {
    try {
      await cursor.chat.completions.create({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
      })
      console.log(`✅ ${model} working`)
    } catch (error) {
      console.log(`❌ ${model} failed: ${error.message}`)
    }
  }
}
```

### Streaming Test

```typescript
async function testStreaming() {
  const cursor = new Cursor({
    apiKey: process.env.CURSOR_API_KEY!,
    checksum: process.env.CURSOR_CHECKSUM!,
  })

  try {
    const stream = await cursor.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Count to 3' }],
      stream: true,
      max_tokens: 20,
    })

    let chunks = 0
    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta.content) {
        chunks++
      }
    }

    console.log(`✅ Streaming works (${chunks} chunks received)`)
    return true
  } catch (error) {
    console.error('❌ Streaming failed:', error.message)
    return false
  }
}
```

## 🔧 Performance Testing

### Latency Test

```typescript
async function testLatency() {
  const cursor = new Cursor({
    apiKey: process.env.CURSOR_API_KEY!,
    checksum: process.env.CURSOR_CHECKSUM!,
  })

  const tests = []
  for (let i = 0; i < 3; i++) {
    const start = Date.now()
    try {
      await cursor.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
      })
      tests.push(Date.now() - start)
    } catch (error) {
      console.error(`Test ${i + 1} failed:`, error.message)
    }
  }

  if (tests.length > 0) {
    const avg = tests.reduce((a, b) => a + b, 0) / tests.length
    console.log(`✅ Average latency: ${avg.toFixed(0)}ms`)
    console.log(`   Range: ${Math.min(...tests)}-${Math.max(...tests)}ms`)
  }
}
```

### Rate Limit Test

```typescript
async function testRateLimit() {
  const cursor = new Cursor({
    apiKey: process.env.CURSOR_API_KEY!,
    checksum: process.env.CURSOR_CHECKSUM!,
  })

  console.log('🔄 Testing rate limits (sending 5 rapid requests)...')

  const promises = Array(5).fill(null).map((_, i) =>
    cursor.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `Request ${i + 1}` }],
      max_tokens: 1,
    }).catch(error => ({ error: error.message }))
  )

  const results = await Promise.all(promises)
  const successful = results.filter(r => !('error' in r)).length
  const rateLimited = results.filter(r => 'error' in r && r.error.includes('rate')).length

  console.log(`✅ ${successful}/5 requests successful`)
  if (rateLimited > 0) {
    console.log(`⚠️  ${rateLimited} requests rate limited`)
  }
}
```

## 🚨 Error Simulation

### Test Error Handling

```typescript
async function testErrorHandling() {
  console.log('🧪 Testing error handling...')

  // Test invalid credentials
  try {
    const badCursor = new Cursor({
      apiKey: 'invalid-key',
      checksum: 'invalid-checksum',
    })

    await badCursor.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test' }],
    })
  } catch (error) {
    console.log('✅ Authentication error handled correctly')
  }

  // Test timeout
  try {
    const cursor = new Cursor({
      apiKey: process.env.CURSOR_API_KEY!,
      checksum: process.env.CURSOR_CHECKSUM!,
    })

    await cursor.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test' }],
    }, {
      timeout: 1, // 1ms timeout to force failure
    })
  } catch (error) {
    console.log('✅ Timeout error handled correctly')
  }
}
```

## 📊 Comprehensive Health Check

```typescript
async function healthCheck() {
  console.log('🏥 Running comprehensive health check...\n')

  const tests = [
    { name: 'Credential Format', fn: () => validateCredentials(process.env.CURSOR_API_KEY!, process.env.CURSOR_CHECKSUM!) },
    { name: 'Network Connectivity', fn: testConnectivity },
    { name: 'Credential Freshness', fn: testCredentialFreshness },
    { name: 'Basic API Call', fn: verify },
    { name: 'Streaming', fn: testStreaming },
  ]

  const results = []
  for (const test of tests) {
    try {
      const result = await test.fn()
      results.push({ name: test.name, passed: result })
      console.log(`${result ? '✅' : '❌'} ${test.name}`)
    } catch (error) {
      results.push({ name: test.name, passed: false })
      console.log(`❌ ${test.name}: ${error.message}`)
    }
  }

  const passed = results.filter(r => r.passed).length
  const total = results.length

  console.log(`\n📊 Health Check Results: ${passed}/${total} tests passed`)

  if (passed === total) {
    console.log('🎉 All systems operational!')
  } else {
    console.log('⚠️  Some issues detected. Check the failed tests above.')
  }

  return passed === total
}
```

## 🛠️ Debug Tools

### Environment Inspector

```typescript
function inspectEnvironment() {
  console.log('🔍 Environment Information:')
  console.log(`Node.js: ${process.version}`)
  console.log(`Platform: ${process.platform}`)
  console.log(`Architecture: ${process.arch}`)

  const hasCredentials = !!(process.env.CURSOR_API_KEY && process.env.CURSOR_CHECKSUM)
  console.log(`Credentials: ${hasCredentials ? '✅ Set' : '❌ Missing'}`)

  detectProxy()
}
```

### Request Logger

```typescript
function createDebugCursor() {
  return new Cursor({
    apiKey: process.env.CURSOR_API_KEY!,
    checksum: process.env.CURSOR_CHECKSUM!,
    fetch: async (url, options) => {
      console.log(`🔗 ${options?.method || 'GET'} ${url}`)
      console.log(`📤 Headers:`, options?.headers)

      const start = Date.now()
      const response = await fetch(url, options)
      const duration = Date.now() - start

      console.log(`📥 ${response.status} ${response.statusText} (${duration}ms)`)
      return response
    }
  })
}
```

## 📋 Quick Troubleshooting

Run this complete diagnostic:

```bash
# 1. Check environment
node -e "console.log('Node.js:', process.version)"

# 2. Verify credentials are set
echo "API Key: ${CURSOR_API_KEY:0:10}..."
echo "Checksum: ${CURSOR_CHECKSUM:0:10}..."

# 3. Test network
curl -I https://api2.cursor.sh

# 4. Run SDK verification
npm run verify

# 5. Run debug script
npm run debug
```

If any step fails, check the corresponding section in this guide for detailed troubleshooting.

