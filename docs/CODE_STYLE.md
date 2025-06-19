# Code Style Guide

This document outlines the coding standards and best practices for the Cursor API SDK project.

## 📋 Table of Contents

- [TypeScript Guidelines](#typescript-guidelines)
- [Code Formatting](#code-formatting)
- [Naming Conventions](#naming-conventions)
- [Documentation Standards](#documentation-standards)
- [Error Handling](#error-handling)
- [Testing Standards](#testing-standards)
- [File Organization](#file-organization)

## 🔷 TypeScript Guidelines

### Type Safety

Use strict TypeScript configuration and explicit typing:

```typescript
// ✅ Good - Explicit types
interface ApiResponse<T> {
  data: T
  status: number
  message: string
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url)
  return response.json()
}

// ❌ Avoid - Implicit any
function fetchData(url) {
  return fetch(url).then(r => r.json())
}
```

### Interface Design

```typescript
// ✅ Good - Clear, specific interfaces
interface ChatCompletionParams {
  model: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  name?: string
}

// ❌ Avoid - Vague or overly broad interfaces
interface RequestParams {
  [key: string]: any
}
```

### Generic Usage

```typescript
// ✅ Good - Meaningful generic constraints
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>
  save(entity: T): Promise<T>
  delete(id: string): Promise<void>
}

// ✅ Good - Descriptive generic names
interface ApiClient<TRequest, TResponse> {
  send(request: TRequest): Promise<TResponse>
}

// ❌ Avoid - Unconstrained or unclear generics
interface Repository<T> {
  save(data: T): Promise<any>
}
```

### Union Types

```typescript
// ✅ Good - Discriminated unions
type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// ✅ Good - String literal unions for constants
type ChatModel =
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'claude-3-5-sonnet-20241022'

// ❌ Avoid - Loose unions without discrimination
type Result = Success | Error
```

## 🎨 Code Formatting

### Indentation and Spacing

```typescript
// ✅ Good - Consistent spacing
const config = {
  apiKey: process.env.CURSOR_API_KEY,
  checksum: process.env.CURSOR_CHECKSUM,
  timeout: 30000,
  retries: 3,
}

// ✅ Good - Aligned parameters
async function createCompletion(
  params: ChatCompletionParams,
  options?: RequestOptions
): Promise<ChatCompletion> {
  return this.client.post('/completions', params, options)
}

// ❌ Avoid - Inconsistent spacing
const config={apiKey:key,timeout:30000}
```

### Line Length

Keep lines under 80-100 characters when possible:

```typescript
// ✅ Good - Readable line breaks
const response = await this.client.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: userMessage },
  ],
  temperature: 0.7,
  maxTokens: 1000,
})

// ❌ Avoid - Long lines
const response = await this.client.chat.completions.create({ model: 'gpt-4', messages: [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: userMessage }], temperature: 0.7, maxTokens: 1000 })
```

### Object and Array Formatting

```typescript
// ✅ Good - Multi-line for readability
const supportedModels = [
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4o',
  'claude-3-5-sonnet-20241022',
]

// ✅ Good - Single line for simple cases
const headers = { 'Content-Type': 'application/json' }

// ✅ Good - Trailing commas for multi-line
const config = {
  apiKey: key,
  timeout: 30000,
  retries: 3, // <- trailing comma
}
```

## 🏷️ Naming Conventions

### Variables and Functions

```typescript
// ✅ Good - camelCase with descriptive names
const apiResponseTimeout = 30000
const userAuthenticationToken = 'token'

async function validateUserCredentials(apiKey: string): Promise<boolean> {
  // implementation
}

function calculateRequestLatency(startTime: number, endTime: number): number {
  return endTime - startTime
}

// ❌ Avoid - Unclear or abbreviated names
const timeout = 30000 // timeout for what?
const tkn = 'token'
const calc = (a, b) => b - a
```

### Classes and Interfaces

```typescript
// ✅ Good - PascalCase with clear purpose
class ChatCompletionClient {
  // implementation
}

interface AuthenticationProvider {
  authenticate(credentials: Credentials): Promise<AuthResult>
}

interface ApiRequestOptions {
  timeout?: number
  retries?: number
}

// ❌ Avoid - Unclear or generic names
class Client {
  // implementation
}

interface Options {
  // properties
}
```

### Constants

```typescript
// ✅ Good - SCREAMING_SNAKE_CASE for module-level constants
const DEFAULT_TIMEOUT = 30000
const MAX_RETRIES = 3
const API_BASE_URL = 'https://api2.cursor.sh'

// ✅ Good - Grouped constants in enums or objects
const HttpStatus = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  INTERNAL_SERVER_ERROR: 500,
} as const

enum ModelType {
  GPT4 = 'gpt-4',
  GPT4_TURBO = 'gpt-4-turbo',
  CLAUDE = 'claude-3-5-sonnet-20241022',
}
```

### File and Directory Names

```
// ✅ Good - kebab-case for files
chat-completions.ts
error-handling.ts
authentication-provider.ts

// ✅ Good - PascalCase for classes (when filename matches class)
ChatClient.ts
AuthenticationError.ts

// ✅ Good - lowercase for directories
src/core/
src/resources/chat/
tests/integration/
```

## 📖 Documentation Standards

### JSDoc Comments

```typescript
/**
 * Creates a chat completion using the specified parameters.
 *
 * @param params - The completion parameters including model and messages
 * @param options - Optional request configuration
 * @returns Promise that resolves to the completion response
 *
 * @throws {AuthenticationError} When API credentials are invalid
 * @throws {RateLimitError} When rate limits are exceeded
 *
 * @example
 * ```typescript
 * const response = await client.createCompletion({
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * })
 * console.log(response.choices[0].message.content)
 * ```
 */
async function createCompletion(
  params: ChatCompletionParams,
  options?: RequestOptions
): Promise<ChatCompletion> {
  // implementation
}
```

### Interface Documentation

```typescript
/**
 * Configuration options for the Cursor API client.
 */
interface ClientOptions {
  /** API key extracted from Cursor IDE */
  apiKey: string

  /** Checksum for request validation */
  checksum: string

  /** Request timeout in milliseconds (default: 60000) */
  timeout?: number

  /** Maximum number of retry attempts (default: 2) */
  maxRetries?: number

  /** Custom base URL for the API (default: https://api2.cursor.sh) */
  baseURL?: string
}
```

### README Sections

```markdown
## Feature Name

Brief description of what this feature does.

### Usage

```typescript
// Basic usage example
const result = await feature.use()
```

### Options

| Option  | Type     | Default     | Description              |
| ------- | -------- | ----------- | ------------------------ |
| `param` | `string` | `'default'` | Description of parameter |

### Error Handling

This feature can throw the following errors:
- `SpecificError` - When specific condition occurs
```

## 🚨 Error Handling

### Custom Error Classes

```typescript
// ✅ Good - Specific error types with clear inheritance
export class CursorApiError extends Error {
  abstract readonly name: string
  abstract readonly status?: number

  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, CursorApiError.prototype)
  }
}

export class AuthenticationError extends CursorApiError {
  readonly name = 'AuthenticationError'
  readonly status = 401

  constructor(message = 'Authentication failed') {
    super(message)
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

// ❌ Avoid - Generic error throwing
throw new Error('Something went wrong')
```

### Error Handling Patterns

```typescript
// ✅ Good - Specific error handling
async function makeApiRequest(url: string): Promise<ApiResponse> {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw this.createErrorFromResponse(response)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error // Re-throw known errors
    }

    if (error instanceof TypeError) {
      throw new ConnectionError('Network request failed')
    }

    throw new ApiError('Unexpected error occurred', error)
  }
}

// ❌ Avoid - Silent error swallowing
async function makeApiRequest(url: string) {
  try {
    return await fetch(url).then(r => r.json())
  } catch (error) {
    console.error(error)
    return null // Silent failure
  }
}
```

## 🧪 Testing Standards

### Test Structure

```typescript
// ✅ Good - Clear test organization
describe('ChatCompletionClient', () => {
  let client: ChatCompletionClient
  let mockApiClient: jest.Mocked<ApiClient>

  beforeEach(() => {
    mockApiClient = createMockApiClient()
    client = new ChatCompletionClient(mockApiClient)
  })

  describe('createCompletion', () => {
    it('should create completion with valid parameters', async () => {
      // Arrange
      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      }
      const expectedResponse = createMockCompletion()
      mockApiClient.post.mockResolvedValue(expectedResponse)

      // Act
      const result = await client.createCompletion(params)

      // Assert
      expect(result).toEqual(expectedResponse)
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/completions',
        params,
        undefined
      )
    })

    it('should throw AuthenticationError for invalid credentials', async () => {
      // Arrange
      mockApiClient.post.mockRejectedValue(new AuthenticationError())

      // Act & Assert
      await expect(client.createCompletion(validParams))
        .rejects.toThrow(AuthenticationError)
    })
  })
})
```

### Test Naming

```typescript
// ✅ Good - Descriptive test names
it('should return cached result when called with same parameters')
it('should retry request on network timeout')
it('should throw ValidationError when model is not supported')

// ❌ Avoid - Vague test names
it('should work')
it('handles errors')
it('test completion')
```

### Mock Setup

```typescript
// ✅ Good - Explicit mock setup
function createMockApiClient(): jest.Mocked<ApiClient> {
  return {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  } as jest.Mocked<ApiClient>
}

function createMockCompletion(overrides?: Partial<ChatCompletion>): ChatCompletion {
  return {
    id: 'test-completion-id',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: 'Test response' },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    ...overrides,
  }
}
```

## 📁 File Organization

### Directory Structure

```
src/
├── index.ts              # Main exports
├── client.ts             # Main client class
├── core/                 # Core functionality
│   ├── api.ts           # HTTP client
│   ├── errors.ts        # Error definitions
│   └── streaming.ts     # Streaming utilities
├── resources/           # API resources
│   └── chat/
│       └── completions.ts
├── types/               # Type definitions
│   ├── chat.ts         # Chat-related types
│   └── shared.ts       # Shared types
├── lib/                # Utility libraries
│   └── protobuf.ts     # Protocol buffer handling
```

### Import Organization

```typescript
// ✅ Good - Organized imports
// Node.js built-ins
import * as fs from 'fs'
import * as path from 'path'

// Third-party libraries
import fetch from 'node-fetch'
import { v4 as uuidv4 } from 'uuid'

// Local imports (relative paths)
import { ApiClient } from '../core/api'
import { ChatMessage, ChatCompletion } from '../types/chat'
import { RequestOptions } from '../types/shared'

// ❌ Avoid - Mixed import order
import { RequestOptions } from '../types/shared'
import fetch from 'node-fetch'
import { ApiClient } from '../core/api'
import * as fs from 'fs'
```

### Export Patterns

```typescript
// ✅ Good - Named exports for utilities
export { ChatCompletionClient } from './chat/completions'
export { ApiClient } from './core/api'
export * from './types/chat'

// ✅ Good - Default export for main class
export default class Cursor {
  // implementation
}

// ✅ Good - Re-exports in index.ts
export { Cursor } from './client'
export type { ChatMessage, ChatCompletion } from './types/chat'
export {
  CursorError,
  AuthenticationError,
  RateLimitError,
} from './core/errors'
```

## 🔧 Configuration Files

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*", "scripts/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### ESLint Configuration (Flat Config)

```javascript
// eslint.config.js
const typescriptParser = require('@typescript-eslint/parser')

module.exports = [
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'tests/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        // Node.js globals
        global: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        // Jest globals for test files
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      // Basic ESLint rules
      'no-unused-vars': 'off', // Handled by TypeScript
      'no-undef': 'off', // Handled by TypeScript
      'no-dupe-class-members': 'off', // Allow method overloads
      'no-constant-condition': ['error', { checkLoops: false }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'eslint.config.js'],
  },
]
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

## ✅ Code Review Checklist

Before submitting code, verify:

- [ ] All functions have proper TypeScript types
- [ ] JSDoc comments for public APIs
- [ ] Error handling follows project patterns
- [ ] Tests cover new functionality
- [ ] No `any` types used
- [ ] Imports are organized correctly
- [ ] File names follow conventions
- [ ] Code is formatted with Prettier
- [ ] ESLint passes without warnings

## 🎯 Best Practices Summary

1. **Type Safety First** - Use strict TypeScript configuration
2. **Clear Naming** - Use descriptive, unambiguous names
3. **Comprehensive Documentation** - Document all public APIs
4. **Consistent Formatting** - Use automated tools (Prettier, ESLint)
5. **Proper Error Handling** - Use specific error types and clear messages
6. **Testable Code** - Write code that's easy to test and mock
7. **Organized Structure** - Keep related code together
8. **Performance Aware** - Consider the performance impact of your code

Following these guidelines ensures that the codebase remains maintainable, readable, and professional.
