import { defineConfig } from 'tsup'

describe('Tsup Configuration', () => {
  it('should import defineConfig from tsup without syntax errors', () => {
    expect(defineConfig).toBeDefined()
    expect(typeof defineConfig).toBe('function')
  })

  it('should have correct Node.js target version', async () => {
    // Import the actual config
    const config = await import('../../tsup.config')
    const configResult = config.default

    expect(configResult).toBeDefined()
    expect(configResult.target).toBe('node18')
  })

  it('should have proper configuration structure', async () => {
    const config = await import('../../tsup.config')
    const configResult = config.default

    expect(configResult).toMatchObject({
      entry: ['src/index.ts'],
      format: ['cjs', 'esm'],
      dts: true,
      splitting: false,
      sourcemap: true,
      clean: true,
      minify: false,
      target: 'node18',
      outDir: 'dist',
      platform: 'node',
      external: ['protobufjs', 'uuid', 'zlib']
    })
  })

  it('should target Node.js 18 for proper compatibility', async () => {
    const config = await import('../../tsup.config')
    const configResult = config.default

    // Verify the Node.js target has been updated from node16 to node18
    expect(configResult.target).toBe('node18')
    expect(configResult.target).not.toBe('node16')
  })
})