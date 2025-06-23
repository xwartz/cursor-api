#!/usr/bin/env tsx

/**
 * Debug authentication script
 * Helps users diagnose authentication issues with their Cursor API credentials
 */

import { Cursor } from '../src/index'
import { execSync } from 'child_process'
import { join } from 'path'

interface DebugConfig {
  apiKey: string | undefined
  checksum: string | undefined
}

/**
 * Get authentication credentials using cursor-tool
 */
function getCredentialsFromCli(): { apiKey: string; checksum: string } | null {
  try {
    console.log('🔑 Trying to get credentials from cursor-tool...')
    // Get the path to the cursor-tool package
    const cliPath = join(__dirname, '../../../packages/cursor-tool')

    // Run the cursor-tool token command
    const output = execSync('pnpm start -- token', {
      cwd: cliPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf-8',
    })

    // Extract token and checksum from output
    const tokenMatch = output.match(/Token: ([^\n]+)/)
    const checksumMatch = output.match(/Checksum: ([^\n]+)/)

    if (tokenMatch && checksumMatch) {
      const apiKey = tokenMatch[1]?.trim() ?? ''
      const checksum = checksumMatch[1]?.trim() ?? ''
      console.log('✅ Successfully retrieved credentials from cursor-tool')
      return { apiKey, checksum }
    }

    return null
  } catch (error) {
    console.error('❌ Failed to get credentials from cursor-tool:', error)
    return null
  }
}

async function debugAuth(): Promise<void> {
  console.log('🔍 Cursor API Authentication Debug Tool\n')

  let apiKey = process.env['CURSOR_API_KEY']
  let checksum = process.env['CURSOR_CHECKSUM']

  // If environment variables are not set, try to get credentials from cursor-tool
  if (!apiKey || !checksum) {
    console.log('⚠️ Missing environment variables, trying cursor-tool...')
    const credentials = getCredentialsFromCli()
    if (credentials) {
      apiKey = credentials.apiKey
      checksum = credentials.checksum
    }
  }

  const config: DebugConfig = {
    apiKey,
    checksum,
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
    console.log(
      'Please set these environment variables or install cursor-tool:'
    )
    console.log('1. Install cursor-tool: npm install -g cursor-tool')
    console.log('2. Run: cursor-tool token')
    console.log('3. Set environment variables:')
    console.log('   export CURSOR_API_KEY="<token>"')
    console.log('   export CURSOR_CHECKSUM="<checksum>"')
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
  console.log('  - Try using cursor-tool to extract fresh credentials')
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
