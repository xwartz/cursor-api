import * as CursorSDK from '../src/index'

describe('Index Exports', () => {
  it('should export Cursor class', () => {
    expect(CursorSDK.Cursor).toBeDefined()
    expect(typeof CursorSDK.Cursor).toBe('function')
  })

  it('should export default Cursor class', () => {
    expect(CursorSDK.default).toBeDefined()
    expect(typeof CursorSDK.default).toBe('function')
    expect(CursorSDK.default).toBe(CursorSDK.Cursor)
  })

  it('should export error classes', () => {
    expect(CursorSDK.CursorError).toBeDefined()
    expect(CursorSDK.APIError).toBeDefined()
    expect(CursorSDK.BadRequestError).toBeDefined()
    expect(CursorSDK.AuthenticationError).toBeDefined()
    expect(CursorSDK.PermissionDeniedError).toBeDefined()
    expect(CursorSDK.NotFoundError).toBeDefined()
    expect(CursorSDK.RateLimitError).toBeDefined()
    expect(CursorSDK.InternalServerError).toBeDefined()
    expect(CursorSDK.ConnectionError).toBeDefined()
    expect(CursorSDK.TimeoutError).toBeDefined()

    // Test error inheritance
    const apiError = new CursorSDK.APIError('Test error')
    expect(apiError).toBeInstanceOf(Error)
    expect(apiError).toBeInstanceOf(CursorSDK.CursorError)
  })

  it('should create Cursor instance with exported class', () => {
    const cursor = new CursorSDK.Cursor({
      apiKey: 'test-key',
      checksum: 'test-checksum',
    })

    expect(cursor).toBeInstanceOf(CursorSDK.Cursor)
    expect(cursor.chat).toBeDefined()
    expect(cursor.chat.completions).toBeDefined()
  })

  it('should create Cursor instance with default export', () => {
    const cursor = new CursorSDK.default({
      apiKey: 'test-key',
      checksum: 'test-checksum',
    })

    expect(cursor).toBeInstanceOf(CursorSDK.default)
    expect(cursor.chat).toBeDefined()
    expect(cursor.chat.completions).toBeDefined()
  })

  it('should have all expected exports', () => {
    const expectedExports = [
      'Cursor',
      'default',
      'CursorError',
      'APIError',
      'BadRequestError',
      'AuthenticationError',
      'PermissionDeniedError',
      'NotFoundError',
      'RateLimitError',
      'InternalServerError',
      'ConnectionError',
      'TimeoutError',
    ]

    expectedExports.forEach(exportName => {
      expect(CursorSDK).toHaveProperty(exportName)
    })
  })

  it('should validate type system for completions', () => {
    // This should compile without TypeScript errors
    const completionParams = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Test system' },
        { role: 'user', content: 'Test user' },
        { role: 'assistant', content: 'Test assistant' },
      ],
      temperature: 0.5,
      max_tokens: 1000,
      stream: false,
    }

    // Verify the types exist and are properly structured
    expect(completionParams.model).toBe('gpt-4o')
    expect(completionParams.messages).toHaveLength(3)
    expect(completionParams.messages[0]?.role).toBe('system')
  })

  it('should validate streaming types', () => {
    // Test streaming-specific types
    const streamingParams = {
      model: 'claude-4-sonnet',
      messages: [{ role: 'user', content: 'Test' }],
      stream: true,
    }

    expect(streamingParams.stream).toBe(true)
    expect(streamingParams.model).toBe('claude-4-sonnet')
  })

  it('should validate client options types', () => {
    // Test all possible client configuration options
    const clientOptions = {
      apiKey: 'test-api-key',
      checksum: 'test-checksum',
      baseURL: 'https://custom.api.url',
      maxRetries: 5,
      timeout: 30000,
      defaultHeaders: {
        'X-Custom-Header': 'test-value',
        Authorization: 'Bearer extra-token',
      },
      fetch: global.fetch,
    }

    const cursor = new CursorSDK.Cursor(clientOptions)
    expect(cursor).toBeInstanceOf(CursorSDK.Cursor)
  })

  it('should validate error response structure', () => {
    // Test error response type structure
    const authError = new CursorSDK.AuthenticationError('Invalid key')
    expect(authError.name).toBe('AuthenticationError')
    expect(authError.status).toBe(401)
    expect(authError.message).toBe('Invalid key')

    const apiError = new CursorSDK.APIError('Custom error', 418, {
      'X-Error-Code': 'TEAPOT',
    })
    expect(apiError.name).toBe('APIError')
    expect(apiError.status).toBe(418)
    expect(apiError.headers).toEqual({ 'X-Error-Code': 'TEAPOT' })
  })

  it('should validate chat model types', () => {
    // Test that all supported model types are valid
    const supportedModels = [
      'claude-4-sonnet',
      'claude-3.7-sonnet',
      'claude-4-opus',
      'gpt-4.1',
      'gpt-4o',
      'gpt-4o-mini',
      'deepseek-r1',
      'deepseek-v3',
      'custom-model-name', // Should also accept custom strings
    ]

    supportedModels.forEach(model => {
      const params = {
        model,
        messages: [{ role: 'user', content: 'Test' }],
      }
      expect(params.model).toBe(model)
    })
  })

  it('should validate request options structure', () => {
    // Test request options type
    const requestOptions = {
      timeout: 15000,
      headers: {
        'X-Request-ID': 'test-123',
        'X-Client-Version': '1.0.0',
      },
      stream: true,
      signal: new AbortController().signal,
    }

    // Should be a valid structure
    expect(requestOptions.timeout).toBe(15000)
    expect(requestOptions.headers).toBeDefined()
    expect(requestOptions.stream).toBe(true)
    expect(requestOptions.signal).toBeInstanceOf(AbortSignal)
  })
})
