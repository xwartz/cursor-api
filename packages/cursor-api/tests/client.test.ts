import { Cursor } from '../src/client'

describe('Cursor Client', () => {
  const mockApiKey = 'test-api-key'
  const mockChecksum = 'test-checksum'

  describe('constructor', () => {
    it('should create client with valid API key', () => {
      const client = new Cursor({ apiKey: mockApiKey, checksum: mockChecksum })
      expect(client).toBeInstanceOf(Cursor)
      expect(client.chat).toBeDefined()
      expect(client.chat.completions).toBeDefined()
    })

    it('should throw error without API key', () => {
      expect(() => {
        new Cursor({ apiKey: '', checksum: mockChecksum })
      }).toThrow('API key is required')
    })

    it('should handle single API key', () => {
      const client = new Cursor({
        apiKey: 'single-key',
        checksum: mockChecksum,
      })
      expect(client).toBeInstanceOf(Cursor)
    })

    it('should use default options', () => {
      const client = new Cursor({
        apiKey: mockApiKey,
        checksum: mockChecksum,
      })
      expect(client).toBeInstanceOf(Cursor)
    })

    it('should accept custom options', () => {
      const client = new Cursor({
        apiKey: mockApiKey,
        checksum: mockChecksum,
        baseURL: 'https://custom.api.endpoint',
        timeout: 30000,
        maxRetries: 3,
      })
      expect(client).toBeInstanceOf(Cursor)
    })
  })

  describe('static create method', () => {
    it('should create client instance', () => {
      const client = Cursor.create({
        apiKey: mockApiKey,
        checksum: mockChecksum,
      })
      expect(client).toBeInstanceOf(Cursor)
    })
  })
})
