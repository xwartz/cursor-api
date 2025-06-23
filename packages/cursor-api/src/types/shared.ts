/**
 * Base configuration for the Cursor API client
 */
export interface ClientOptions {
  /**
   * Cursor session token
   */
  apiKey: string

  /**
   * Custom base URL for the Cursor API
   * @default "https://api2.cursor.sh"
   */
  baseURL?: string

  /**
   * Custom checksum for request validation
   * This is required for authenticating with the Cursor API
   */
  checksum: string

  /**
   * Maximum number of retries for failed requests
   * @default 2
   */
  maxRetries?: number

  /**
   * Timeout in milliseconds for requests
   * @default 60000
   */
  timeout?: number

  /**
   * Custom headers to include with requests
   */
  defaultHeaders?: Record<string, string>

  /**
   * Custom fetch implementation
   */
  fetch?: typeof fetch
}

/**
 * Error response from the API
 */
export interface ErrorResponse {
  error: {
    message: string
    type: string
    code?: string
  }
}

/**
 * Base API response wrapper
 */
export interface APIResponse<T = unknown> {
  data: T
  response: Response
}

/**
 * Stream completion response chunk
 */
export interface StreamChunk<T = unknown> {
  data: T
  event?: string
  id?: string
  retry?: number
}

/**
 * Request options for API calls
 */
export interface RequestOptions {
  /**
   * Request timeout in milliseconds
   */
  timeout?: number

  /**
   * Additional headers for this request
   */
  headers?: Record<string, string>

  /**
   * Whether to stream the response
   */
  stream?: boolean

  /**
   * Signal to abort the request
   */
  signal?: AbortSignal
}
