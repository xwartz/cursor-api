#!/usr/bin/env tsx

import { Cursor } from '../src'
import type { ChatCompletionChunk } from '../src/types/chat'

interface VerificationResult {
  success: boolean
  message: string
  details?: string
}

/**
 * Verify Cursor API SDK functionality
 */

async function verify(): Promise<void> {
  const apiKey = process.env['CURSOR_API_KEY']
  const checksum = process.env['CURSOR_CHECKSUM']

  if (!apiKey) {
    console.error('❌ CURSOR_API_KEY environment variable not set')
    console.log('\n📋 To get your API key:')
    console.log('1. Visit https://cursor.com and log in')
    console.log('2. Open DevTools (F12) → Application → Cookies')
    console.log('3. Find "WorkosCursorSessionToken" cookie')
    console.log('4. Copy its value and set: export CURSOR_API_KEY="<token>"')
    process.exit(1)
  }

  if (!checksum) {
    console.error('❌ CURSOR_CHECKSUM environment variable not set')
    process.exit(1)
  }

  console.log('🔍 Verifying Cursor API SDK...\n')

  const cursor = new Cursor({ apiKey, checksum })
  const results: VerificationResult[] = []

  // Test 1: Basic client initialization
  console.log('1️⃣ Testing client initialization...')
  results.push({
    success: true,
    message: 'Client initialized successfully',
  })

  // Test 2: Chat completion
  console.log('2️⃣ Testing chat completion...')
  try {
    const start = Date.now()
    const completion = await cursor.chat.completions.create({
      model: 'claude-4-sonnet',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from Cursor SDK!" and nothing else.',
        },
      ],
      max_tokens: 10,
    })

    const duration = Date.now() - start
    results.push({
      success: true,
      message: `Chat completion successful (${duration}ms)`,
      details: `Response: ${completion.choices[0]?.message.content}`,
    })
  } catch (error: unknown) {
    results.push({
      success: false,
      message: 'Chat completion failed',
      details: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 3: Streaming completion
  console.log('3️⃣ Testing streaming completion...')
  try {
    const start = Date.now()
    const stream = (await cursor.chat.completions.create({
      model: 'claude-4-sonnet',
      messages: [
        {
          role: 'user',
          content: 'Count from 1 to 3, each number on a new line.',
        },
      ],
      max_tokens: 10,
      stream: true,
    })) as unknown as ReadableStream<ChatCompletionChunk>

    let chunks = 0
    let totalContent = ''
    const reader = stream.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        chunks++
        const deltaContent = value.choices?.[0]?.delta?.content
        if (deltaContent) {
          totalContent += deltaContent
        }
      }
    } finally {
      reader.releaseLock()
    }

    const duration = Date.now() - start
    results.push({
      success: true,
      message: `Streaming completion successful (${duration}ms)`,
      details: `Received ${chunks} chunks, content: "${totalContent.trim()}"`,
    })
  } catch (error: unknown) {
    results.push({
      success: false,
      message: 'Streaming completion failed',
      details: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 4: Error handling
  console.log('4️⃣ Testing error handling...')
  try {
    await cursor.chat.completions.create({
      model: 'invalid-model',
      messages: [{ role: 'user', content: 'test' }],
    })
    results.push({
      success: false,
      message: 'Error handling test failed - should have thrown an error',
    })
  } catch (error: unknown) {
    const isExpectedError =
      error instanceof Error && error.message.startsWith('API Error:')

    if (isExpectedError) {
      results.push({
        success: true,
        message: 'Error handling works correctly',
        details: `Caught expected error: ${error.constructor.name}`,
      })
    } else {
      results.push({
        success: false,
        message: 'Unexpected error type',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Test 5: Performance benchmark
  console.log('5️⃣ Running performance benchmark...')
  try {
    const startTime = Date.now()
    await cursor.chat.completions.create({
      model: 'claude-4-sonnet',
      messages: [{ role: 'user', content: 'What is 2+2?' }],
      max_tokens: 10,
    })
    const responseTime = Date.now() - startTime

    const performance =
      responseTime < 2000
        ? 'Excellent'
        : responseTime < 5000
          ? 'Good'
          : responseTime < 10000
            ? 'Fair'
            : 'Slow'

    results.push({
      success: true,
      message: `Performance: ${performance} (${responseTime}ms)`,
    })
  } catch (error: unknown) {
    results.push({
      success: false,
      message: 'Performance benchmark failed',
      details: error instanceof Error ? error.message : String(error),
    })
  }

  // Print results
  console.log('\n📊 Verification Results:')
  console.log('========================')

  let passed = 0
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${index + 1}. ${result.message}`)
    if (result.details) {
      console.log(`   ${result.details}`)
    }
    if (result.success) passed++
  })

  console.log('\n📈 Summary:')
  console.log(`✅ Passed: ${passed}/${results.length}`)
  console.log(`❌ Failed: ${results.length - passed}/${results.length}`)

  if (passed === results.length) {
    console.log('\n🎉 All tests passed! The SDK is working correctly.')
    process.exit(0)
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.')
    process.exit(1)
  }
}

// 运行验证
if (require.main === module) {
  verify().catch((error: unknown) => {
    console.error('Verification failed:', error)
    process.exit(1)
  })
}
