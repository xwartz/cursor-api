#!/usr/bin/env tsx

import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'

// Use require to avoid type issues
const semver = require('semver')

/**
 * Comprehensive pre-release check
 * Ensure package quality and integrity
 */
async function preReleaseCheck(): Promise<void> {
  console.log('🚀 Starting pre-release check...\n')

  try {
    // 1. Check Git status
    await checkGitStatus()

    // 2. Check version number
    await checkVersion()

    // 3. Run full test suite
    await runFullTests()

    // 4. Build and verify
    await buildAndVerify()

    // 5. Check package contents
    await checkPackageContents()

    // 6. Check dependency security
    await checkDependencySecurity()

    // 7. Verify documentation
    await checkDocumentation()

    console.log('✅ All pre-release checks passed!')
    console.log('📦 Package is ready for release')
  } catch (error) {
    console.error('❌ Pre-release check failed:', error)
    process.exit(1)
  }
}

/**
 * Check Git status
 */
async function checkGitStatus(): Promise<void> {
  console.log('🔍 Checking Git status...')

  try {
    // Check for uncommitted changes
    const status = execSync('git status --porcelain', { encoding: 'utf8' })
    if (status.trim()) {
      throw new Error(
        'Repository has uncommitted changes, please commit all changes first'
      )
    }

    // Check current branch
    const branch = execSync('git branch --show-current', {
      encoding: 'utf8',
    }).trim()
    if (branch !== 'main' && branch !== 'master') {
      console.warn(
        `⚠️  Current branch is '${branch}', usually should release from main/master branch`
      )
    }

    // Check if synced with remote
    try {
      execSync('git fetch', { stdio: 'pipe' })
      const behind = execSync('git rev-list --count HEAD..origin/main', {
        encoding: 'utf8',
      }).trim()
      if (parseInt(behind) > 0) {
        throw new Error(
          'Local branch is behind remote branch, please pull latest changes first'
        )
      }
    } catch (error) {
      console.warn('⚠️  Unable to check remote branch status')
    }

    console.log('  ✅ Git status check passed\n')
  } catch (error) {
    throw new Error(`Git status check failed: ${error}`)
  }
}

/**
 * Check version number
 */
async function checkVersion(): Promise<void> {
  console.log('🔢 Checking version number...')

  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  const currentVersion = packageJson.version

  if (!semver.valid(currentVersion)) {
    throw new Error(`Invalid version number: ${currentVersion}`)
  }

  // Check CHANGELOG
  if (existsSync('CHANGELOG.md')) {
    const changelog = readFileSync('CHANGELOG.md', 'utf8')
    if (!changelog.includes(currentVersion)) {
      console.warn(`⚠️  Version ${currentVersion} not found in CHANGELOG.md`)
    }
  }

  console.log(`  ✓ Version: ${currentVersion}`)
  console.log('  ✅ Version check passed\n')
}

/**
 * Run full test suite
 */
async function runFullTests(): Promise<void> {
  console.log('🧪 Running full test suite...')

  try {
    // Code linting
    console.log('  Running code linting...')
    execSync('npm run lint', { stdio: 'inherit' })

    // Type checking
    console.log('  Running type checking...')
    execSync('npm run type-check', { stdio: 'inherit' })

    // Unit tests
    console.log('  Running unit tests...')
    execSync('npm run test:coverage', { stdio: 'inherit' })

    console.log('  ✅ All test suites passed\n')
  } catch (error) {
    throw new Error(`Tests failed: ${error}`)
  }
}

/**
 * Build and verify
 */
async function buildAndVerify(): Promise<void> {
  console.log('🔨 Building and verifying...')

  try {
    // Clean previous build
    execSync('rm -rf dist', { stdio: 'pipe' })

    // Build
    console.log('  Building package...')
    execSync('npm run build', { stdio: 'inherit' })

    // Verify build
    console.log('  Verifying build artifacts...')
    execSync('npm run verify:build', { stdio: 'inherit' })

    console.log('  ✅ Build verification passed\n')
  } catch (error) {
    throw new Error(`Build verification failed: ${error}`)
  }
}

/**
 * Check package contents
 */
async function checkPackageContents(): Promise<void> {
  console.log('📋 Checking package contents...')

  try {
    // Use npm pack to check package contents
    // We need to capture both stdout and stderr since npm notice goes to stderr
    const packOutput = execSync('npm pack --dry-run 2>&1', {
      encoding: 'utf8',
    })

    // Extract only the npm notice section
    const noticeLines = packOutput
      .split('\n')
      .filter(
        line =>
          line.startsWith('npm notice') &&
          (line.includes('kB') || line.includes('MB'))
      )
      .join('\n')

    // Check if required files are included
    const requiredFiles = [
      'dist/index.js',
      'dist/index.mjs',
      'dist/index.d.ts',
      'README.md',
      'package.json',
    ]

    for (const file of requiredFiles) {
      // Check if the file is listed in the npm pack output
      // The output format is: "npm notice size filename"
      const filePattern = new RegExp(
        `npm notice\\s+[\\d\\.]+\\w+\\s+${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        'm'
      )

      const found = filePattern.test(noticeLines)

      if (!found) {
        throw new Error(`Required file missing from package: ${file}`)
      }
    }

    // Check package size
    const lines = packOutput.split('\n')
    const sizeLine = lines.find(line => line.includes('Unpacked size:'))
    if (sizeLine) {
      console.log(`  📦 ${sizeLine.trim()}`)
    }

    console.log('  ✅ Package contents check passed\n')
  } catch (error) {
    throw new Error(`Package contents check failed: ${error}`)
  }
}

/**
 * Check dependency security
 */
async function checkDependencySecurity(): Promise<void> {
  console.log('🔒 Checking dependency security...')

  try {
    // Run npm audit
    execSync('npm audit', { stdio: 'inherit' })
    console.log('  ✅ Security check passed\n')
  } catch (error) {
    console.warn('⚠️  Security audit found issues, please review')
    console.log('  ⚠️  Security check completed with warnings\n')
  }
}

/**
 * Verify documentation
 */
async function checkDocumentation(): Promise<void> {
  console.log('📚 Checking documentation...')

  try {
    // Check README
    if (!existsSync('README.md')) {
      throw new Error('README.md not found')
    }

    const readme = readFileSync('README.md', 'utf8')
    if (readme.length < 100) {
      throw new Error('README.md too short')
    }

    // Check package.json metadata
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    const requiredFields = ['description', 'keywords', 'license']

    for (const field of requiredFields) {
      if (!packageJson[field]) {
        console.warn(`⚠️  package.json missing ${field}`)
      }
    }

    console.log('  ✅ Documentation check passed\n')
  } catch (error) {
    throw new Error(`Documentation check failed: ${error}`)
  }
}

// Run pre-release check
if (require.main === module) {
  preReleaseCheck().catch(console.error)
}

export { preReleaseCheck }
