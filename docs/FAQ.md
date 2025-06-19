# Frequently Asked Questions (FAQ)

Common issues, troubleshooting, and solutions for the Cursor API SDK.

## 🔐 Authentication Issues

### Q: My credentials stopped working suddenly
**A:** Cursor credentials are session-based and expire when:
- Cursor IDE restarts or updates
- Session times out (usually 24-48 hours)
- You sign out and back in
- Network configuration changes

**Solution**: Re-extract credentials using proxy tools. Set up monitoring to detect expired credentials.

### Q: I get SSL/TLS errors when using proxy tools
**A:** This happens when intercepting HTTPS traffic:
1. **Install proxy's SSL certificate** on your system
2. **Trust the certificate** in OS certificate store
3. **Configure SSL proxying** for `api2.cursor.sh` domain
4. **Restart Cursor IDE** after certificate installation

For Charles Proxy: Help → SSL Proxying → Install Charles Root Certificate

### Q: Proxy shows no traffic from Cursor IDE
**A:** Try these solutions:
- **Check proxy port** (usually 8888 for Charles)
- **Configure system proxy** in OS network settings
- **Disable other VPNs/proxies** that might interfere
- **Try different proxy tools** (Burp Suite, mitmproxy)
- **Run Cursor as administrator** on Windows

### Q: Can I automate credential extraction?
**A:** Currently no. Cursor doesn't provide an API for credential access. You must manually extract them using network interception tools.

## 🚨 Runtime Errors

### Q: "fetch is not available" error in Node.js
**A:** Happens in Node.js < 18. Solutions:
```typescript
// Option 1: Upgrade to Node.js 18+
node --version

// Option 2: Use polyfill
import fetch from 'node-fetch'
const cursor = new Cursor({
  apiKey: 'your-key',
  checksum: 'your-checksum',
  fetch: fetch as any,
})
```

### Q: Streaming stops mid-response
**A:** Common causes and fixes:
- **Network timeout**: Increase timeout values
- **Proxy interference**: Try direct connection
- **Memory issues**: Process chunks immediately, don't buffer
- **Connection drops**: Implement reconnection logic

```typescript
const stream = await cursor.chat.completions.create({
  model: 'gpt-4',
  messages: messages,
  stream: true,
}, {
  timeout: 120000, // Longer timeout for streaming
})
```

### Q: Getting "Invalid model" errors
**A:** Model availability changes. Current working models:
- `gpt-4` (most reliable)
- `claude-3-5-sonnet-20241022`
- `gpt-4o`, `gpt-4o-mini`

Avoid deprecated models like `gpt-3.5-turbo` or old Claude versions.

### Q: High memory usage with streaming
**A:** Process chunks immediately instead of accumulating:
```typescript
// ❌ Don't do this
let fullResponse = ''
for await (const chunk of stream) {
  fullResponse += chunk.choices[0]?.delta.content || ''
}

// ✅ Do this
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta.content
  if (content) {
    processContent(content) // Process immediately
  }
}
```

## 🌐 Network & Connectivity

### Q: Requests fail behind corporate firewall
**A:** Corporate networks often block AI APIs:
1. **Whitelist domains**: `api2.cursor.sh`, `*.cursor.sh`
2. **Configure proxy**: Use corporate proxy settings
3. **Check ports**: Ensure HTTPS (443) is allowed
4. **Contact IT**: Request access to Cursor API endpoints

### Q: Intermittent connection failures
**A:** Implement robust retry logic:
```typescript
async function retryRequest(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
    }
  }
}
```

### Q: Slow response times
**A:** Optimization strategies:
- **Use faster models**: `gpt-4o-mini` vs `gpt-4`
- **Reduce max_tokens**: Limit response length
- **Enable streaming**: Better perceived performance
- **Cache responses**: For repeated queries
- **Use CDN/edge functions**: Deploy closer to users

## 🔧 Development Issues

### Q: ESLint configuration errors after update
**A:** We've migrated to ESLint 9.0 flat config format:

**Old format (no longer supported):**
```javascript
// .eslintrc.js (deprecated)
module.exports = {
  extends: ['@typescript-eslint/recommended'],
  // ...
}
```

**New format (ESLint 9.0+):**
```javascript
// eslint.config.js (required)
const typescriptParser = require('@typescript-eslint/parser')

module.exports = [
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'tests/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'off', // Handled by TypeScript
      'no-undef': 'off', // Handled by TypeScript
    },
  },
]
```

### Q: TypeScript compilation errors
**A:** We've updated to TypeScript 5.6. Common fixes:
```bash
# Update TypeScript if using older version
npm install -D typescript@^5.6.0

# Check tsconfig.json for compatibility
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

### Q: Jest test failures after dependency updates
**A:** We've updated to Jest 30. Update your configuration:
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Remove deprecated options if present
  // collectCoverageFrom updated syntax
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
}
```

### Q: ESM vs CommonJS issues
**A:** The SDK supports both, but mixing can cause issues:
```javascript
// ESM (preferred)
import { Cursor } from 'cursor-api'

// CommonJS
const { Cursor } = require('cursor-api')
```

For Next.js, add to `next.config.js`:
```javascript
module.exports = {
  experimental: {
    esmExternals: true
  }
}
```

### Q: Dependency version conflicts
**A:** We've updated major dependencies. If you encounter conflicts:

**Updated versions:**
- TypeScript: `^5.6.0`
- ESLint: `^9.0.0`
- Jest: `^30.0.0`
- Node types: `^22.0.0`

**Resolution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Or force resolution in package.json
{
  "overrides": {
    "typescript": "^5.6.0",
    "eslint": "^9.0.0"
  }
}
```

### Q: Testing with mocked responses
**A:** Mock the SDK for testing:
```typescript
// Jest
jest.mock('cursor-api', () => ({
  Cursor: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock response' } }]
        })
      }
    }
  }))
}))
```

## 🏭 Production Issues

### Q: Rate limiting in production
**A:** Implement proper rate limiting:
```typescript
class RateLimiter {
  private requests = new Map<string, number[]>()

  async checkLimit(key: string, limit: number, window: number): Promise<boolean> {
    const now = Date.now()
    const requests = this.requests.get(key) || []

    // Remove old requests outside window
    const validRequests = requests.filter(time => now - time < window)

    if (validRequests.length >= limit) {
      return false // Rate limited
    }

    validRequests.push(now)
    this.requests.set(key, validRequests)
    return true
  }
}
```

### Q: Memory leaks in long-running applications
**A:** Common causes and fixes:
- **Unreleased stream readers**: Always call `reader.releaseLock()`
- **Event listeners**: Remove listeners when done
- **Large response caching**: Implement TTL and size limits
- **Circular references**: Be careful with conversation history

### Q: Monitoring and observability
**A:** Add comprehensive logging:
```typescript
const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
  defaultHeaders: {
    'X-Request-ID': () => generateRequestId(),
    'X-App-Version': process.env.APP_VERSION,
  }
})

// Log all requests
cursor.on('request', (req) => {
  console.log(`[${req.id}] ${req.method} ${req.url}`)
})

cursor.on('response', (res) => {
  console.log(`[${res.requestId}] ${res.status} ${res.duration}ms`)
})
```

## 🔍 Debugging Tools

### Q: How to enable verbose logging?
**A:** Set environment variables:
```bash
export DEBUG=cursor-api:*
export NODE_ENV=development
npm run your-app
```

### Q: Testing connectivity without making API calls
**A:** Use the built-in verification:
```bash
export CURSOR_API_KEY="your-key"
export CURSOR_CHECKSUM="your-checksum"
npm run verify
```

### Q: Inspecting raw HTTP requests
**A:** Use a debugging proxy:
```typescript
const cursor = new Cursor({
  apiKey: 'your-key',
  checksum: 'your-checksum',
  fetch: async (url, options) => {
    console.log('Request:', { url, options })
    const response = await fetch(url, options)
    console.log('Response:', response.status, response.headers)
    return response
  }
})
```

## 🆘 Getting Help

### Still having issues?

1. **Check the logs** - Enable verbose logging first
2. **Test with minimal example** - Isolate the problem
3. **Verify credentials** - Re-extract if needed
4. **Search existing issues** - Someone might have the same problem
5. **Create detailed issue** - Include logs, code, and environment details

### Useful Resources

- 🔧 [Verification Guide](./VERIFICATION.md) - Testing and debugging tools
- 📖 [API Reference](./API_REFERENCE.md) - Complete API documentation
- 💡 [Examples](./EXAMPLES.md) - Production-ready code examples
- 🐛 [GitHub Issues](https://github.com/xwartz/cursor-api/issues) - Report bugs or get help

### Quick Debug Checklist

- [ ] Credentials are fresh (< 24 hours old)
- [ ] Network connectivity to `api2.cursor.sh`
- [ ] Node.js version 18+
- [ ] No firewall/proxy blocking requests
- [ ] Correct model names being used
- [ ] Proper error handling implemented
- [ ] Request timeouts configured appropriately
