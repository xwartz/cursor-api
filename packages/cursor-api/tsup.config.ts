import { defineConfig } from 'tsup'

export default defineConfig({
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
  external: ['protobufjs', 'uuid', 'zlib'],
  treeshake: true,
  cjsInterop: true,
  bundle: true,
})
