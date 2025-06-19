import { Cursor } from '../src/index'
import type { ChatCompletionChunk } from '../src/types/chat'

async function basicExample(): Promise<void> {
  // Initialize the client
  const cursor = new Cursor({
    apiKey: process.env['CURSOR_API_KEY'] || 'your-cursor-session-token',
    checksum: process.env['CURSOR_CHECKSUM'] || 'your-cursor-checksum',
  })

  try {
    // Basic chat completion
    console.log('Creating chat completion...')
    const completion = await cursor.chat.completions.create({
      model: 'claude-4-sonnet',
      messages: [{ role: 'user', content: 'Hello! How are you?' }],
    })

    console.log('Response:', completion.choices[0]?.message.content)

    // Streaming example
    console.log('\nCreating streaming completion...')
    const result = await cursor.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Tell me a short story' }],
      stream: true,
    })

    // Type guard to check if result is a stream
    if (result && typeof result === 'object' && 'getReader' in result) {
      console.log('Streaming response:')
      const stream = result as unknown as ReadableStream<ChatCompletionChunk>
      const reader = stream.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const content = value.choices?.[0]?.delta?.content
          if (content) {
            process.stdout.write(content)
          }
        }
      } finally {
        reader.releaseLock()
      }
    }

    console.log('\n\nDone!')
  } catch (error) {
    console.error('Error:', error)
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  basicExample().catch(console.error)
}
