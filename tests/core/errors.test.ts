import {
  CursorError,
  APIError,
  BadRequestError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  RateLimitError,
  InternalServerError,
  ConnectionError,
  TimeoutError,
} from '../../src/core/errors'

describe('Error Classes', () => {
  describe('CursorError', () => {
    it('should create error from 400 response', () => {
      const response = { status: 400 } as Response
      const error = CursorError.fromResponse(response, 'Bad request')

      expect(error).toBeInstanceOf(BadRequestError)
      expect(error.message).toBe('Bad request')
      expect(error.status).toBe(400)
    })

    it('should create error from 401 response', () => {
      const response = { status: 401 } as Response
      const error = CursorError.fromResponse(response, 'Unauthorized')

      expect(error).toBeInstanceOf(AuthenticationError)
      expect(error.message).toBe('Unauthorized')
      expect(error.status).toBe(401)
    })

    it('should create error from 403 response', () => {
      const response = { status: 403 } as Response
      const error = CursorError.fromResponse(response, 'Forbidden')

      expect(error).toBeInstanceOf(PermissionDeniedError)
      expect(error.message).toBe('Forbidden')
      expect(error.status).toBe(403)
    })

    it('should create error from 404 response', () => {
      const response = { status: 404 } as Response
      const error = CursorError.fromResponse(response, 'Not found')

      expect(error).toBeInstanceOf(NotFoundError)
      expect(error.message).toBe('Not found')
      expect(error.status).toBe(404)
    })

    it('should create error from 429 response', () => {
      const response = { status: 429 } as Response
      const error = CursorError.fromResponse(response, 'Rate limited')

      expect(error).toBeInstanceOf(RateLimitError)
      expect(error.message).toBe('Rate limited')
      expect(error.status).toBe(429)
    })

    it('should create error from 500 response', () => {
      const response = { status: 500 } as Response
      const error = CursorError.fromResponse(response, 'Server error')

      expect(error).toBeInstanceOf(InternalServerError)
      expect(error.message).toBe('Server error')
      expect(error.status).toBe(500)
    })

    it('should create generic API error for unknown status', () => {
      const response = { status: 418 } as Response
      const error = CursorError.fromResponse(response, 'Teapot error')

      expect(error).toBeInstanceOf(APIError)
      expect(error.message).toBe('Teapot error')
      expect(error.status).toBe(418)
    })

    it('should use default messages when none provided', () => {
      const response400 = { status: 400 } as Response
      const error400 = CursorError.fromResponse(response400)
      expect(error400.message).toBe('Bad request')

      const response401 = { status: 401 } as Response
      const error401 = CursorError.fromResponse(response401)
      expect(error401.message).toBe('Authentication failed')

      const response403 = { status: 403 } as Response
      const error403 = CursorError.fromResponse(response403)
      expect(error403.message).toBe('Permission denied')

      const response404 = { status: 404 } as Response
      const error404 = CursorError.fromResponse(response404)
      expect(error404.message).toBe('Not found')

      const response429 = { status: 429 } as Response
      const error429 = CursorError.fromResponse(response429)
      expect(error429.message).toBe('Rate limit exceeded')

      const response500 = { status: 500 } as Response
      const error500 = CursorError.fromResponse(response500)
      expect(error500.message).toBe('Internal server error')

      const response418 = { status: 418 } as Response
      const error418 = CursorError.fromResponse(response418)
      expect(error418.message).toBe('API error')
    })
  })

  describe('APIError', () => {
    it('should create error with message and status', () => {
      const error = new APIError('Test error', 400)

      expect(error.name).toBe('APIError')
      expect(error.message).toBe('Test error')
      expect(error.status).toBe(400)
      expect(error.headers).toBeUndefined()
    })

    it('should create error with headers', () => {
      const headers = { 'X-Custom': 'value' }
      const error = new APIError('Test error', 400, headers)

      expect(error.headers).toBe(headers)
    })

    it('should create error without status', () => {
      const error = new APIError('Test error')

      expect(error.status).toBeUndefined()
    })
  })

  describe('BadRequestError', () => {
    it('should create error with correct properties', () => {
      const error = new BadRequestError('Bad request')

      expect(error.name).toBe('BadRequestError')
      expect(error.message).toBe('Bad request')
      expect(error.status).toBe(400)
      expect(error).toBeInstanceOf(CursorError)
    })
  })

  describe('AuthenticationError', () => {
    it('should create error with custom message', () => {
      const error = new AuthenticationError('Custom auth error')

      expect(error.name).toBe('AuthenticationError')
      expect(error.message).toBe('Custom auth error')
      expect(error.status).toBe(401)
      expect(error).toBeInstanceOf(CursorError)
    })

    it('should create error with default message', () => {
      const error = new AuthenticationError()

      expect(error.message).toBe('Invalid API key provided')
    })
  })

  describe('PermissionDeniedError', () => {
    it('should create error with correct properties', () => {
      const error = new PermissionDeniedError('Permission denied')

      expect(error.name).toBe('PermissionDeniedError')
      expect(error.message).toBe('Permission denied')
      expect(error.status).toBe(403)
      expect(error).toBeInstanceOf(CursorError)
    })
  })

  describe('NotFoundError', () => {
    it('should create error with correct properties', () => {
      const error = new NotFoundError('Not found')

      expect(error.name).toBe('NotFoundError')
      expect(error.message).toBe('Not found')
      expect(error.status).toBe(404)
      expect(error).toBeInstanceOf(CursorError)
    })
  })

  describe('RateLimitError', () => {
    it('should create error with custom message', () => {
      const error = new RateLimitError('Custom rate limit')

      expect(error.name).toBe('RateLimitError')
      expect(error.message).toBe('Custom rate limit')
      expect(error.status).toBe(429)
      expect(error).toBeInstanceOf(CursorError)
    })

    it('should create error with default message', () => {
      const error = new RateLimitError()

      expect(error.message).toBe('Rate limit exceeded')
    })
  })

  describe('InternalServerError', () => {
    it('should create error with correct properties', () => {
      const error = new InternalServerError('Server error')

      expect(error.name).toBe('InternalServerError')
      expect(error.message).toBe('Server error')
      expect(error.status).toBe(500)
      expect(error).toBeInstanceOf(CursorError)
    })
  })

  describe('ConnectionError', () => {
    it('should create error with custom message', () => {
      const error = new ConnectionError('Custom connection error')

      expect(error.name).toBe('ConnectionError')
      expect(error.message).toBe('Custom connection error')
      expect(error).toBeInstanceOf(CursorError)
    })

    it('should create error with default message', () => {
      const error = new ConnectionError()

      expect(error.message).toBe('Connection failed')
    })
  })

  describe('TimeoutError', () => {
    it('should create error with custom message', () => {
      const error = new TimeoutError('Custom timeout error')

      expect(error.name).toBe('TimeoutError')
      expect(error.message).toBe('Custom timeout error')
      expect(error).toBeInstanceOf(CursorError)
    })

    it('should create error with default message', () => {
      const error = new TimeoutError()

      expect(error.message).toBe('Request timed out')
    })
  })
})
