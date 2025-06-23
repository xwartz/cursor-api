import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

/**
 * Build artifacts integration tests
 * Test whether built code can work properly in real environments
 */
describe('Build Integration Tests', () => {
  const tempDir = join(tmpdir(), 'cursor-sdk-test')
  const projectRoot = process.cwd()
  const distDir = join(projectRoot, 'dist')

  beforeAll(() => {
    // Ensure build artifacts exist
    const distPath = join(distDir, 'index.js')
    if (!existsSync(distPath)) {
      throw new Error(
        'Build artifacts do not exist, please run npm run build first'
      )
    }
  })

  describe('CommonJS Module', () => {
    it('should be able to import and use normally', () => {
      const indexPath = join(distDir, 'index.js')
      const { Cursor } = require(indexPath)

      expect(Cursor).toBeDefined()
      expect(typeof Cursor).toBe('function')

      // Test instantiation
      const client = new Cursor({
        apiKey: 'test-key',
        checksum: 'test-checksum',
      })

      expect(client).toBeDefined()
      expect(client.chat).toBeDefined()
      expect(client.chat.completions).toBeDefined()
    })

    it('should export all necessary types and error classes', () => {
      const indexPath = join(distDir, 'index.js')
      const sdk = require(indexPath)

      // Verify main exports
      expect(sdk.Cursor).toBeDefined()
      expect(sdk.CursorError).toBeDefined()
      expect(sdk.APIError).toBeDefined()
      expect(sdk.AuthenticationError).toBeDefined()
      expect(sdk.BadRequestError).toBeDefined()
    })

    it('should be able to handle error instantiation', () => {
      const indexPath = join(distDir, 'index.js')
      const { AuthenticationError, BadRequestError } = require(indexPath)

      const authError = new AuthenticationError('Test error')
      expect(authError).toBeInstanceOf(Error)
      expect(authError.status).toBe(401)

      const badReqError = new BadRequestError('Bad request')
      expect(badReqError).toBeInstanceOf(Error)
      expect(badReqError.status).toBe(400)
    })
  })

  describe('ESM Module', () => {
    it('should work with ESM import syntax via external process', () => {
      const testScript = `
import { Cursor } from '${join(distDir, 'index.mjs')}'

const client = new Cursor({
  apiKey: 'test-key',
  checksum: 'test-checksum'
})

console.log('SUCCESS: ESM import works')
console.log('Client has chat:', !!client.chat)
console.log('Client has completions:', !!client.chat.completions)
`

      const tempFile = join(tempDir, 'temp-esm-test.mjs')
      mkdirSync(tempDir, { recursive: true })
      writeFileSync(tempFile, testScript)

      try {
        const output = execSync(`node ${tempFile}`, {
          encoding: 'utf8',
          timeout: 10000,
        })

        expect(output).toMatch(/SUCCESS: ESM import works/)
        expect(output).toMatch(/Client has chat: true/)
        expect(output).toMatch(/Client has completions: true/)
      } finally {
        // Clean up
        try {
          execSync(`rm -f ${tempFile}`, { stdio: 'pipe' })
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    })

    it('should export error classes in ESM', () => {
      const testScript = `
import {
  Cursor,
  AuthenticationError,
  APIError
} from '${join(distDir, 'index.mjs')}'

const authError = new AuthenticationError('Test error')
const apiError = new APIError('API error', 500)

console.log('SUCCESS: All error classes imported')
console.log('AuthError status:', authError.status)
console.log('APIError status:', apiError.status)
`

      const tempFile = join(tempDir, 'temp-esm-errors.mjs')
      mkdirSync(tempDir, { recursive: true })
      writeFileSync(tempFile, testScript)

      try {
        const output = execSync(`node ${tempFile}`, {
          encoding: 'utf8',
          timeout: 10000,
        })

        expect(output).toMatch(/SUCCESS: All error classes imported/)
        expect(output).toMatch(/AuthError status: 401/)
        expect(output).toMatch(/APIError status: 500/)
      } finally {
        // Clean up
        try {
          execSync(`rm -f ${tempFile}`, { stdio: 'pipe' })
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    })

    it('should support both named and default exports', () => {
      const testScript = `
import { Cursor as NamedCursor } from '${join(distDir, 'index.mjs')}'
import DefaultCursor from '${join(distDir, 'index.mjs')}'

console.log('Named and default are same:', NamedCursor === DefaultCursor)
console.log('Both are functions:', typeof NamedCursor === 'function' && typeof DefaultCursor === 'function')

const client1 = new NamedCursor({ apiKey: 'test', checksum: 'test' })
const client2 = new DefaultCursor({ apiKey: 'test', checksum: 'test' })

console.log('Both clients work:', !!client1.chat && !!client2.chat)
`

      const tempFile = join(tempDir, 'temp-esm-exports.mjs')
      mkdirSync(tempDir, { recursive: true })
      writeFileSync(tempFile, testScript)

      try {
        const output = execSync(`node ${tempFile}`, {
          encoding: 'utf8',
          timeout: 10000,
        })

        expect(output).toMatch(/Named and default are same: true/)
        expect(output).toMatch(/Both are functions: true/)
        expect(output).toMatch(/Both clients work: true/)
      } finally {
        // Clean up
        try {
          execSync(`rm -f ${tempFile}`, { stdio: 'pipe' })
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    })
  })

  describe('TypeScript Declaration Files', () => {
    it('should contain correct type declarations', () => {
      const dtsPath = join(distDir, 'index.d.ts')
      expect(existsSync(dtsPath)).toBe(true)

      const dtsContent = readFileSync(dtsPath, 'utf8')

      // Verify main type exports
      expect(dtsContent).toContain('declare class Cursor')
      expect(dtsContent).toContain('type ClientOptions')
      expect(dtsContent).toContain('type ChatMessage')
      expect(dtsContent).toContain('declare class APIError')
    })

    it('type declarations should be syntactically correct', () => {
      // Use TypeScript compiler to verify declaration files
      const dtsPath = join(distDir, 'index.d.ts')
      expect(() => {
        execSync(`npx tsc --noEmit --skipLibCheck ${dtsPath}`, {
          stdio: 'pipe',
        })
      }).not.toThrow()
    })
  })

  describe('Performance and Size', () => {
    it('build file size should be reasonable', () => {
      const indexPath = join(distDir, 'index.js')
      const stats = require('fs').statSync(indexPath)
      const sizeMB = stats.size / 1024 / 1024

      console.log(`Build size: ${sizeMB.toFixed(2)}MB`)

      // Build should not exceed 5MB
      expect(sizeMB).toBeLessThan(5)
    })

    it('module load time should be reasonable', () => {
      const indexPath = join(distDir, 'index.js')
      const start = Date.now()
      require(indexPath)
      const loadTime = Date.now() - start

      console.log(`Module load time: ${loadTime}ms`)

      // Module load time should not exceed 1 second
      expect(loadTime).toBeLessThan(1000)
    })
  })

  describe('Dependency Compatibility', () => {
    it('should handle external dependencies correctly', () => {
      const indexPath = join(distDir, 'index.js')
      const buildContent = readFileSync(indexPath, 'utf8')

      // Verify external dependencies are not bundled
      expect(buildContent).not.toContain('node_modules/protobufjs')
      expect(buildContent).not.toContain('node_modules/uuid')

      // Verify protobufjs is externalized
      expect(buildContent).toContain(
        "var $protobuf = require('protobufjs/minimal.js');"
      )

      // But should have correct require calls
      expect(buildContent).toContain("var uuid = require('uuid');")
    })

    it('should resolve dependency paths correctly', () => {
      // Test actual module resolution
      const indexPath = join(distDir, 'index.js')
      expect(() => {
        const { Cursor } = require(indexPath)
        new Cursor({
          apiKey: 'test-key',
          checksum: 'test-checksum',
        })
      }).not.toThrow()
    })
  })

  describe('External Project Integration', () => {
    let testProjectDir: string

    beforeAll(() => {
      // Create temporary test project
      testProjectDir = join(tempDir, `test-project-${Date.now()}`)
      mkdirSync(testProjectDir, { recursive: true })
    })

    afterAll(() => {
      // Clean up test project
      try {
        execSync(`rm -rf ${testProjectDir}`, { stdio: 'pipe' })
      } catch (error) {
        // Ignore cleanup errors
      }
    })

    it('should work in ESM project', () => {
      // Create ESM package.json
      const packageJson = {
        name: 'cursor-sdk-esm-test',
        version: '1.0.0',
        type: 'module',
        dependencies: {
          'cursor-api': `file:${projectRoot}`,
        },
      }

      writeFileSync(
        join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      )

      // Create ESM test file
      const testCode = `
import { Cursor } from 'cursor-api'

const client = new Cursor({
  apiKey: 'test-key',
  checksum: 'test-checksum'
})

console.log('ESM SDK imported successfully:', !!client.chat)
`

      writeFileSync(join(testProjectDir, 'test-esm.mjs'), testCode)

      try {
        // Install dependencies
        execSync('npm install', {
          cwd: testProjectDir,
          stdio: 'pipe',
          timeout: 30000,
        })

        // Run test code
        const output = execSync('node test-esm.mjs', {
          cwd: testProjectDir,
          encoding: 'utf8',
          timeout: 10000,
        })

        expect(output).toMatch(/ESM SDK imported successfully: true/)
      } catch (error) {
        console.error('ESM integration test failed:', error)
        throw error
      }
    })

    it('should work in CommonJS project', () => {
      // Create CJS package.json
      const packageJson = {
        name: 'cursor-sdk-cjs-test',
        version: '1.0.0',
        type: 'commonjs',
        dependencies: {
          'cursor-api': `file:${projectRoot}`,
        },
      }

      writeFileSync(
        join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      )

      // Create CJS test file
      const testCode = `
const { Cursor } = require('cursor-api')

const client = new Cursor({
  apiKey: 'test-key',
  checksum: 'test-checksum'
})

console.log('CJS SDK imported successfully:', !!client.chat)
`

      writeFileSync(join(testProjectDir, 'test-cjs.js'), testCode)

      try {
        // Install dependencies
        execSync('npm install', {
          cwd: testProjectDir,
          stdio: 'pipe',
          timeout: 30000,
        })

        // Run test code
        const output = execSync('node test-cjs.js', {
          cwd: testProjectDir,
          encoding: 'utf8',
          timeout: 10000,
        })

        expect(output).toMatch(/CJS SDK imported successfully: true/)
      } catch (error) {
        console.error('CJS integration test failed:', error)
        throw error
      }
    })

    it('should handle mixed imports correctly', () => {
      // Create mixed package.json
      const packageJson = {
        name: 'cursor-sdk-mixed-test',
        version: '1.0.0',
        dependencies: {
          'cursor-api': `file:${projectRoot}`,
        },
      }

      writeFileSync(
        join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      )

      // Create mixed test file
      const testCode = `
const { Cursor: CJSCursor } = require('cursor-api')

import('cursor-api').then(({ Cursor: ESMCursor }) => {
  const cjsClient = new CJSCursor({ apiKey: 'test', checksum: 'test' })
  const esmClient = new ESMCursor({ apiKey: 'test', checksum: 'test' })

  console.log('Mixed imports work:', !!cjsClient.chat && !!esmClient.chat)
})
`

      writeFileSync(join(testProjectDir, 'test-mixed.js'), testCode)

      try {
        // Install dependencies
        execSync('npm install', {
          cwd: testProjectDir,
          stdio: 'pipe',
          timeout: 30000,
        })

        // Run test code
        const output = execSync('node test-mixed.js', {
          cwd: testProjectDir,
          encoding: 'utf8',
          timeout: 10000,
        })

        expect(output).toMatch(/Mixed imports work: true/)
      } catch (error) {
        console.error('Mixed imports test failed:', error)
        throw error
      }
    })
  })
})
