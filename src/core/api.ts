import type { ClientOptions, RequestOptions } from '../types/shared'
import { CursorError, ConnectionError, TimeoutError, APIError } from './errors'

/**
 * Base API client class
 */
export class APIClient {
  private readonly apiKey: string
  private readonly baseURL: string
  private readonly maxRetries: number
  private readonly timeout: number
  private readonly defaultHeaders: Record<string, string>
  private readonly fetch: typeof fetch
  private readonly checksum: string

  constructor(options: ClientOptions) {
    if (!options.apiKey) {
      throw new Error('API key is required')
    }

    if (!options.checksum) {
      throw new Error('Checksum is required')
    }

    this.apiKey = options.apiKey.trim()
    this.baseURL = options.baseURL ?? 'https://api2.cursor.sh'
    this.maxRetries = options.maxRetries ?? 2
    this.timeout = options.timeout ?? 60000
    this.defaultHeaders = options.defaultHeaders ?? {}
    this.fetch = options.fetch ?? globalThis.fetch
    this.checksum = options.checksum

    if (!this.fetch) {
      throw new Error(
        'fetch is not available. Please provide a fetch implementation.'
      )
    }
  }

  /**
   * Create request headers
   */
  private createHeaders(options?: RequestOptions): Record<string, string> {
    // Handle URL-encoded keys
    const cleanApiKey = this.apiKey.includes('%3A%3A')
      ? this.apiKey.split('%3A%3A')[1]
      : this.apiKey

    return {
      authorization: `Bearer ${cleanApiKey}`,
      'x-cursor-checksum': this.checksum,
      'Content-Type': 'application/connect+proto',
      'connect-accept-encoding': 'gzip',
      'connect-protocol-version': '1',
      'user-agent': 'connect-es/1.6.1',
      'x-cursor-client-version': '1.1.3',
      'x-cursor-timezone': 'Asia/Shanghai',
      'x-ghost-mode': 'true',
      'x-cursor-streaming': options?.stream ? 'true' : 'false',
      'x-new-onboarding-completed': 'false',
      Host: new URL(this.baseURL).host,
      ...this.defaultHeaders,
      ...options?.headers,
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T>(
    endpoint: string,
    options: {
      method: string
      body?: BodyInit
      stream?: boolean
    } & RequestOptions
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers = this.createHeaders(options)

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(
          () => controller.abort(),
          options.timeout ?? this.timeout
        )

        const response = await this.fetch(url, {
          method: options.method,
          headers,
          body: options.body ?? null,
          signal: options.signal ?? controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          throw CursorError.fromResponse(response, errorText)
        }

        return response as T
      } catch (error) {
        lastError = error as Error

        // Don't retry on client errors (4xx) or if it's the last attempt
        if (
          error instanceof CursorError &&
          error.status &&
          error.status < 500
        ) {
          throw error
        }

        if (attempt === this.maxRetries) {
          break
        }

        // Wait before retrying (exponential backoff)
        await this.sleep(Math.pow(2, attempt) * 1000)
      }
    }

    if (lastError) {
      if (lastError.name === 'AbortError') {
        throw new TimeoutError('Request timed out')
      }

      if (lastError instanceof CursorError) {
        throw lastError
      }

      throw new ConnectionError(`Request failed: ${lastError.message}`)
    }

    throw new APIError('Request failed after all retries')
  }

  /**
   * Utility function to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * POST request helper
   */
  async post<T>(
    endpoint: string,
    body: BodyInit,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body,
      ...options,
    })
  }

  /**
   * GET request helper
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
      ...options,
    })
  }
}
