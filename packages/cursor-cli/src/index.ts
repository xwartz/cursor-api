#!/usr/bin/env node

/**
 * Cursor CLI
 * Collection of command-line tools for Cursor IDE
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import Database from 'better-sqlite3'

interface CursorTokenInfo {
  token: string
  checksum: string
  machineId: string
  macMachineId: string
}

/**
 * Get the Cursor data directory path based on the current platform
 */
function getCursorDataPath(): string {
  const home = homedir()

  switch (process.platform) {
    case 'win32':
      return join(
        process.env.APPDATA || join(home, 'AppData', 'Roaming'),
        'Cursor'
      )
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'Cursor')
    case 'linux':
      return join(
        process.env.XDG_CONFIG_HOME || join(home, '.config'),
        'Cursor'
      )
    default:
      throw new Error(`Unsupported platform: ${process.platform}`)
  }
}

/**
 * Generate timestamp header (mimics Rust implementation)
 */
function generateTimestampHeader(): string {
  const timestamp = Math.floor(Date.now() / 1000 / 1000) // Divide by 1000 to match Rust implementation

  // Build timestamp byte array
  const timestampBytes = new Uint8Array([
    (timestamp >> 8) & 0xff,
    timestamp & 0xff,
    (timestamp >> 24) & 0xff,
    (timestamp >> 16) & 0xff,
    (timestamp >> 8) & 0xff,
    timestamp & 0xff,
  ])

  // Obfuscate bytes (mimics Rust's obfuscate_bytes function)
  let prev = 165
  for (let i = 0; i < timestampBytes.length; i++) {
    const oldValue = timestampBytes[i]
    timestampBytes[i] = (oldValue ^ prev) + (i % 256)
    prev = timestampBytes[i]
  }

  // Base64 encode
  return Buffer.from(timestampBytes).toString('base64')
}

/**
 * Get access token from Cursor database
 */
function getAccessToken(dbPath: string): string {
  try {
    const db = new Database(dbPath, { readonly: true })
    const result = db
      .prepare(
        "SELECT value FROM ItemTable WHERE key = 'cursorAuth/accessToken'"
      )
      .get() as { value: string } | undefined
    db.close()

    if (!result) {
      throw new Error('Access token not found in database')
    }

    return result.value.trim()
  } catch (error) {
    throw new Error(`Failed to read access token: ${error}`)
  }
}

/**
 * Get device IDs from storage.json
 */
function getDeviceIds(storagePath: string): {
  machineId: string
  macMachineId: string
} {
  try {
    const storageContent = readFileSync(storagePath, 'utf8')
    const storage = JSON.parse(storageContent)

    const machineId = storage['telemetry.machineId']
    const macMachineId = storage['telemetry.macMachineId']

    if (!machineId || !macMachineId) {
      throw new Error('Machine IDs not found in storage.json')
    }

    return { machineId, macMachineId }
  } catch (error) {
    throw new Error(`Failed to read device IDs: ${error}`)
  }
}

/**
 * Generate checksum
 */
function generateChecksum(machineId: string, macMachineId: string): string {
  const timestampHeader = generateTimestampHeader()
  return `${timestampHeader}${machineId}/${macMachineId}`
}

/**
 * Get Cursor Token information
 */
export function getCursorTokenInfo(): CursorTokenInfo {
  const cursorPath = getCursorDataPath()
  const dbPath = join(cursorPath, 'User', 'globalStorage', 'state.vscdb')
  const storagePath = join(cursorPath, 'User', 'globalStorage', 'storage.json')

  console.log(`📁 Cursor data path: ${cursorPath}`)
  console.log(`🗄️  Database path: ${dbPath}`)
  console.log(`📄 Config file path: ${storagePath}`)

  // Get access token
  const token = getAccessToken(dbPath)
  console.log(`🔑 Access Token: ${token.substring(0, 20)}...`)

  // Get device IDs
  const { machineId, macMachineId } = getDeviceIds(storagePath)
  console.log(`💻 Machine ID: ${machineId}`)
  console.log(`🔗 MAC Machine ID: ${macMachineId}`)

  // Generate checksum
  const checksum = generateChecksum(machineId, macMachineId)
  console.log(`✅ Checksum: ${checksum}`)

  return {
    token,
    checksum,
    machineId,
    macMachineId,
  }
}

/**
 * Validate token format
 */
function validateToken(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) {
    console.warn('⚠️  Invalid token format. Expected 3 parts separated by "."')
    return false
  }

  if (!token.startsWith('ey')) {
    console.warn('⚠️  Token should start with "ey"')
    return false
  }

  return true
}

/**
 * Token command handler
 */
function tokenCommand() {
  try {
    console.log('🚀 Starting Cursor Token extraction...\n')

    const tokenInfo = getCursorTokenInfo()

    console.log('\n📋 Complete information:')
    console.log('=====================================')
    console.log(`Token: ${tokenInfo.token}`)
    console.log(`Checksum: ${tokenInfo.checksum}`)
    console.log('=====================================')

    // Validate token format
    if (validateToken(tokenInfo.token)) {
      console.log('✅ Token format validation passed')
    }

    console.log('\n💡 Usage:')
    console.log('Add the Token and Checksum to your tokens.json file')
    console.log('Format: "token,checksum"')
    console.log(`Example: "${tokenInfo.token},${tokenInfo.checksum}"`)
  } catch (error) {
    console.error('❌ Failed to get Token information:', error)
    process.exit(1)
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log('Cursor CLI - Command-line tools collection\n')
  console.log('Usage:')
  console.log('  cursor-cli [command]')
  console.log('\nCommands:')
  console.log('  token       Extract Cursor Token information')
  console.log('  help        Show help information')
  console.log('\nExamples:')
  console.log('  cursor-cli token')
  console.log('  cursor-cli help')
}

/**
 * Main function
 */
function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const command = args[0] || 'help'

  // Execute appropriate command
  switch (command) {
    case 'token':
      tokenCommand()
      break
    case 'help':
      showHelp()
      break
    default:
      // If no command or unknown command, execute token command (for backward compatibility)
      tokenCommand()
      break
  }
}

// If this file is run directly (CommonJS compatible approach)
if (require.main === module) {
  main()
}

// Export functions for programmatic usage
export { main, tokenCommand as getToken }
