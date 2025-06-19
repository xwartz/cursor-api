#!/usr/bin/env tsx

/**
 * Debug authentication script
 * Helps users diagnose authentication issues with their Cursor API credentials
 */

import { Cursor } from '../src/index'

interface DebugConfig {
  apiKey: string | undefined
  checksum: string | undefined
}

async function debugAuth(): Promise<void> {
  console.log('🔍 Cursor API Authentication Debug Tool\n')

  const config: DebugConfig = {
    apiKey: process.env['CURSOR_API_KEY'],
    checksum: process.env['CURSOR_CHECKSUM'],
  }

  // Check environment variables
  console.log('📋 Environment Variables Check:')
  console.log(`  CURSOR_API_KEY: ${config.apiKey ? '✅ Set' : '❌ Not set'}`)
  console.log(`  CURSOR_CHECKSUM: ${config.checksum ? '✅ Set' : '❌ Not set'}`)
  console.log()

  if (!config.apiKey || !config.checksum) {
    console.log('❌ Missing required credentials:')
    if (!config.apiKey) {
      console.log('  - CURSOR_API_KEY environment variable not set')
    }
    if (!config.checksum) {
      console.log('  - CURSOR_CHECKSUM environment variable not set')
    }
    console.log()
    console.log('Please set these environment variables and try again.')
    console.log(
      'See docs/AUTHENTICATION.md for instructions on how to obtain these values.'
    )
    process.exit(1)
  }

  // Validate credential format
  console.log('🔑 Credential Format Validation:')

  // Check API key format
  if (config.apiKey.length < 10) {
    console.log('  ⚠️  API key seems too short')
  } else {
    console.log('  ✅ API key length looks reasonable')
  }

  // Check checksum format
  if (config.checksum.length < 10) {
    console.log('  ⚠️  Checksum seems too short')
  } else {
    console.log('  ✅ Checksum length looks reasonable')
  }

  console.log()

  // Test API connection
  console.log('🌐 Testing API Connection:')

  try {
    const cursor = new Cursor({
      apiKey: config.apiKey,
      checksum: config.checksum,
    })

    console.log('  ✅ Client created successfully')

    // Test simple completion
    console.log('  🧪 Testing simple completion...')
    const completion = await cursor.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: 'Hello! Please respond with just "Hello back!"',
        },
      ],
      max_tokens: 10,
    })

    if (completion.choices[0]?.message?.content) {
      console.log('  ✅ API test successful!')
      console.log(
        `  📝 Response: "${completion.choices[0].message.content.trim()}"`
      )
    } else {
      console.log('  ⚠️  API responded but with unexpected format')
      console.log('  📝 Full response:', JSON.stringify(completion, null, 2))
    }
  } catch (error: unknown) {
    console.log('  ❌ API test failed')

    const err = error as Error
    if (err.name === 'AuthenticationError') {
      console.log('  🔑 Authentication Error: Invalid API key or checksum')
      console.log('     Please verify your credentials are correct')
    } else if (err.name === 'ConnectionError') {
      console.log('  🌐 Connection Error: Unable to connect to Cursor API')
      console.log('     Please check your internet connection')
    } else if (err.name === 'TimeoutError') {
      console.log('  ⏰ Timeout Error: Request took too long')
      console.log('     The API might be experiencing issues')
    } else {
      console.log(`  🔥 ${err.name || 'Unknown Error'}: ${err.message}`)
    }

    console.log('\n  📝 Full error details:')
    console.log(`     ${err.stack || String(err)}`)
  }

  console.log('\n🎯 Debug Summary:')
  console.log('  - If authentication failed, double-check your credentials')
  console.log('  - See docs/AUTHENTICATION.md for detailed setup instructions')
  console.log(
    '  - For further help, create an issue with the debug output above'
  )
}

// Run the debug script
if (require.main === module) {
  debugAuth().catch(error => {
    console.error('Debug script failed:', error)
    process.exit(1)
  })
}
