import type { ClientOptions } from './types/shared'
import { APIClient } from './core/api'
import { ChatCompletions } from './resources/chat/completions'

/**
 * Main Cursor API client
 */
export class Cursor {
  private apiClient: APIClient

  /**
   * Chat completions API
   */
  public readonly chat: {
    completions: ChatCompletions
  }

  constructor(options: ClientOptions) {
    this.apiClient = new APIClient(options)

    // Initialize resource endpoints
    this.chat = {
      completions: new ChatCompletions(this.apiClient),
    }
  }

  /**
   * Create a new Cursor client instance
   */
  static create(options: ClientOptions): Cursor {
    return new Cursor(options)
  }
}
