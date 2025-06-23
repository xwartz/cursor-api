#!/usr/bin/env tsx

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * Verify build artifacts integrity and functionality
 */
async function verifyBuild(): Promise<void> {
  console.log('🔍 Starting build verification...\n')

  try {
    // 1. Verify build files exist
    await verifyBuildFiles()

    // 2. Verify TypeScript declaration files
    await verifyTypeDeclarations()

    // 3. Verify CommonJS and ESM exports
    await verifyModuleExports()

    // 4. Verify basic functionality
    await verifyBasicFunctionality()

    // 5. Verify dependency integrity
    await verifyDependencies()

    console.log('✅ Build verification passed!')
  } catch (error) {
    console.error('❌ Build verification failed:', error)
    process.exit(1)
  }
}

/**
 * Verify build files exist
 */
async function verifyBuildFiles(): Promise<void> {
  console.log('📁 Verifying build files...')

  const requiredFiles = [
    'dist/index.js', // CommonJS version
    'dist/index.mjs', // ESM version
    'dist/index.d.ts', // TypeScript declaration file
  ]

  for (const file of requiredFiles) {
    if (!existsSync(file)) {
      throw new Error(`Missing build file: ${file}`)
    }
    console.log(`  ✓ ${file}`)
  }

  // Verify build file size is reasonable
  const stats = require('fs').statSync('dist/index.js')
  if (stats.size === 0) {
    throw new Error('Build file is empty')
  }
  if (stats.size > 10 * 1024 * 1024) {
    // 10MB
    console.warn(
      `⚠️  Build file is large: ${(stats.size / 1024 / 1024).toFixed(2)}MB`
    )
  }

  console.log('  ✅ Build files verification passed\n')
}

/**
 * Verify TypeScript declaration files
 */
async function verifyTypeDeclarations(): Promise<void> {
  console.log('🔤 Verifying TypeScript declaration files...')

  try {
    // Use tsc to verify declaration files
    execSync('npx tsc --noEmit --skipLibCheck dist/index.d.ts', {
      stdio: 'pipe',
    })
    console.log('  ✅ TypeScript declaration files verification passed\n')
  } catch (error) {
    throw new Error(
      `TypeScript declaration files verification failed: ${error}`
    )
  }
}

/**
 * Verify module exports
 */
async function verifyModuleExports(): Promise<void> {
  console.log('📦 Verifying module exports...')

  // Verify CommonJS exports
  try {
    const cjsModule = require(join(process.cwd(), 'dist/index.js'))
    if (!cjsModule.Cursor) {
      throw new Error('CommonJS version missing Cursor export')
    }
    if (!cjsModule.default) {
      throw new Error('CommonJS version missing default export')
    }
    console.log('  ✓ CommonJS exports verification passed')
  } catch (error) {
    throw new Error(`CommonJS module verification failed: ${error}`)
  }

  // Verify ESM exports (through dynamic import)
  try {
    const esmPath = `file://${join(process.cwd(), 'dist/index.mjs')}`
    const esmModule = await import(esmPath)
    if (!esmModule.Cursor) {
      throw new Error('ESM version missing Cursor export')
    }
    if (!esmModule.default) {
      throw new Error('ESM version missing default export')
    }
    console.log('  ✓ ESM exports verification passed')
  } catch (error) {
    throw new Error(`ESM module verification failed: ${error}`)
  }

  console.log('  ✅ Module exports verification passed\n')
}

/**
 * Verify basic functionality
 */
async function verifyBasicFunctionality(): Promise<void> {
  console.log('⚙️  Verifying basic functionality...')

  try {
    const { Cursor } = require(join(process.cwd(), 'dist/index.js'))

    // Verify client instantiation
    const client = new Cursor({
      apiKey: 'test-key',
      checksum: 'test-checksum',
    })

    if (!client.chat) {
      throw new Error('Client missing chat property')
    }

    if (!client.chat.completions) {
      throw new Error('Client missing completions method')
    }

    console.log('  ✓ Client instantiation successful')
    console.log('  ✓ API methods exist')
    console.log('  ✅ Basic functionality verification passed\n')
  } catch (error) {
    throw new Error(`Basic functionality verification failed: ${error}`)
  }
}

/**
 * Verify dependency integrity
 */
async function verifyDependencies(): Promise<void> {
  console.log('🔗 Verifying dependency integrity...')

  const buildFile = readFileSync('dist/index.js', 'utf8')

  // Verify external dependencies are correctly excluded
  const externals = ['protobufjs', 'uuid']
  for (const external of externals) {
    if (buildFile.includes(`node_modules/${external}`)) {
      throw new Error(
        `Build file contains dependency that should be external: ${external}`
      )
    }
    if (!buildFile.includes(`require("${external}")`)) {
      console.warn(
        `⚠️  Build file doesn't contain dependency reference: ${external}`
      )
    }
  }

  console.log('  ✓ External dependencies correctly excluded')
  console.log('  ✅ Dependency integrity verification passed\n')
}

// Run verification
if (require.main === module) {
  verifyBuild().catch(console.error)
}

export { verifyBuild }
