/**
 * Base error class for all Cursor API errors
 */
export abstract class CursorError extends Error {
  abstract override readonly name: string
  abstract readonly status: number | undefined

  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, CursorError.prototype)
  }

  /**
   * Create an error from a response
   */
  static fromResponse(response: Response, message?: string): CursorError {
    const status = response.status

    if (status === 400) {
      return new BadRequestError(message ?? 'Bad request')
    }

    if (status === 401) {
      return new AuthenticationError(message ?? 'Authentication failed')
    }

    if (status === 403) {
      return new PermissionDeniedError(message ?? 'Permission denied')
    }

    if (status === 404) {
      return new NotFoundError(message ?? 'Not found')
    }

    if (status === 429) {
      return new RateLimitError(message ?? 'Rate limit exceeded')
    }

    if (status >= 500) {
      return new InternalServerError(message ?? 'Internal server error')
    }

    return new APIError(message ?? 'API error', status)
  }

  /**
   * Create an error from a generic Error object
   */
  static fromError(error: Error): CursorError {
    const message = error.message.toLowerCase()

    if (message.includes('timeout')) {
      return new TimeoutError(error.message)
    }

    if (message.includes('network') || message.includes('fetch')) {
      return new ConnectionError(error.message, error)
    }

    if (message.includes('abort')) {
      return new ConnectionError(error.message, error)
    }

    // Generic error wrapper
    const cursorError = new APIError(error.message)
    if ('cause' in cursorError) {
      ;(cursorError as any).cause = error
    }
    return cursorError
  }
}

/**
 * Generic API error
 */
export class APIError extends CursorError {
  readonly name = 'APIError'
  readonly status: number | undefined

  constructor(
    message: string,
    status?: number,
    public readonly headers?: Record<string, string>
  ) {
    super(message)
    this.status = status
    Object.setPrototypeOf(this, APIError.prototype)
  }
}

/**
 * Bad request error (400)
 */
export class BadRequestError extends CursorError {
  readonly name = 'BadRequestError'
  readonly status = 400

  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, BadRequestError.prototype)
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends CursorError {
  readonly name = 'AuthenticationError'
  readonly status = 401

  constructor(message: string = 'Invalid API key provided') {
    super(message)
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

/**
 * Permission denied error (403)
 */
export class PermissionDeniedError extends CursorError {
  readonly name = 'PermissionDeniedError'
  readonly status = 403

  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, PermissionDeniedError.prototype)
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends CursorError {
  readonly name = 'NotFoundError'
  readonly status = 404

  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends CursorError {
  readonly name = 'RateLimitError'
  readonly status = 429

  constructor(message: string = 'Rate limit exceeded') {
    super(message)
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

/**
 * Internal server error (5xx)
 */
export class InternalServerError extends CursorError {
  readonly name = 'InternalServerError'
  readonly status = 500

  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, InternalServerError.prototype)
  }
}

/**
 * Connection error
 */
export class ConnectionError extends CursorError {
  readonly name = 'ConnectionError'
  readonly status = undefined
  readonly cause?: Error

  constructor(message: string = 'Connection failed', cause?: Error) {
    super(message)
    if (cause) {
      this.cause = cause
    }
    Object.setPrototypeOf(this, ConnectionError.prototype)
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends CursorError {
  readonly name = 'TimeoutError'
  readonly status = undefined
  readonly timeout?: number

  constructor(message: string = 'Request timed out', timeout?: number) {
    super(message)
    if (timeout) {
      this.timeout = timeout
    }
    Object.setPrototypeOf(this, TimeoutError.prototype)
  }
}
