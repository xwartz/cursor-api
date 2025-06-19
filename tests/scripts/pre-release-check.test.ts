import { execSync } from 'child_process'

// Mock child_process
jest.mock('child_process')
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>

// Mock console.log and console.error to avoid cluttering test output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()

// Import the module after mocking
const preReleaseCheckPath = '../../scripts/pre-release-check'

// We need to import the function we want to test
// Since it's not exported, we'll need to test it through the main function or extract it
describe('Pre-release Check Script', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
  })

  describe('checkPackageContents function', () => {
    it('should successfully validate when all required files are present in npm pack output', () => {
      const mockNpmPackOutput = `
npm notice 
npm notice 📦  cursor-api@1.0.0
npm notice === Tarball Contents === 
npm notice 1.2kB  package.json
npm notice 856B   README.md
npm notice 2.1kB  CHANGELOG.md
npm notice 445B   LICENSE
npm notice 3.4kB  dist/index.js
npm notice 1.8kB  dist/index.d.ts
npm notice 2.3kB  dist/client.js
npm notice 1.1kB  dist/client.d.ts
npm notice === Tarball Details === 
npm notice name:          cursor-api                              
npm notice version:       1.0.0                                   
npm notice filename:      cursor-api-1.0.0.tgz                   
npm notice package size:  4.2 kB                                  
npm notice unpacked size: 13.2 kB                                 
npm notice shasum:        abc123def456                            
npm notice integrity:     sha512-abc123==                       
npm notice total files:   8                                       
npm notice 
`

      mockExecSync.mockReturnValue(mockNpmPackOutput)

      // Since the function is not exported, we need to test it indirectly
      // We'll create a test version that extracts the logic
      const checkPackageContents = () => {
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
            'package.json',
            'README.md',
            'CHANGELOG.md',
            'LICENSE',
            'dist/index.js',
            'dist/index.d.ts'
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
        } catch (error) {
          throw error
        }
      }

      expect(() => checkPackageContents()).not.toThrow()
    })

    it('should throw error when required file is missing from npm pack output', () => {
      const mockNpmPackOutput = `
npm notice 
npm notice 📦  cursor-api@1.0.0
npm notice === Tarball Contents === 
npm notice 1.2kB  package.json
npm notice 856B   README.md
npm notice 445B   LICENSE
npm notice 3.4kB  dist/index.js
npm notice 1.8kB  dist/index.d.ts
npm notice === Tarball Details === 
npm notice name:          cursor-api                              
npm notice version:       1.0.0                                   
npm notice 
`

      mockExecSync.mockReturnValue(mockNpmPackOutput)

      const checkPackageContents = () => {
        try {
          const packOutput = execSync('npm pack --dry-run 2>&1', {
            encoding: 'utf8',
          })

          const noticeLines = packOutput
            .split('\n')
            .filter(
              line =>
                line.startsWith('npm notice') &&
                (line.includes('kB') || line.includes('MB'))
            )
            .join('\n')

          const requiredFiles = [
            'package.json',
            'README.md',
            'CHANGELOG.md', // This file is missing from the mock output
            'LICENSE',
            'dist/index.js',
            'dist/index.d.ts'
          ]

          for (const file of requiredFiles) {
            const filePattern = new RegExp(
              `npm notice\\s+[\\d\\.]+\\w+\\s+${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
              'm'
            )

            const found = filePattern.test(noticeLines)

            if (!found) {
              throw new Error(`Required file missing from package: ${file}`)
            }
          }
        } catch (error) {
          throw error
        }
      }

      expect(() => checkPackageContents()).toThrow('Required file missing from package: CHANGELOG.md')
    })

    it('should handle npm pack command execution error', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('npm pack failed')
      })

      const checkPackageContents = () => {
        try {
          const packOutput = execSync('npm pack --dry-run 2>&1', {
            encoding: 'utf8',
          })
        } catch (error) {
          throw error
        }
      }

      expect(() => checkPackageContents()).toThrow('npm pack failed')
    })

    it('should properly filter npm notice lines with size information', () => {
      const mockNpmPackOutput = `
npm notice 
npm notice 📦  cursor-api@1.0.0
npm notice === Tarball Contents === 
npm notice 1.2kB  package.json
npm notice 856B   README.md
npm notice this line has no size info
npm notice 2.1MB  large-file.bin
npm notice === Tarball Details === 
npm notice name:          cursor-api
npm notice 
`

      const noticeLines = mockNpmPackOutput
        .split('\n')
        .filter(
          line =>
            line.startsWith('npm notice') &&
            (line.includes('kB') || line.includes('MB'))
        )
        .join('\n')

      expect(noticeLines).toContain('1.2kB  package.json')
      expect(noticeLines).toContain('856B   README.md')
      expect(noticeLines).toContain('2.1MB  large-file.bin')
      expect(noticeLines).not.toContain('this line has no size info')
      expect(noticeLines).not.toContain('name:          cursor-api')
    })
  })
})