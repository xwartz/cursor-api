# Build Quality Assurance Guide

This document explains how to ensure the build quality and runtime stability of the Cursor API SDK.

## 🎯 Goals

Ensure that each build:

1. ✅ Runs normally in target environments
2. ✅ Maintains backward compatibility with existing user code
3. ✅ Provides correct type definitions
4. ✅ Contains necessary dependency declarations
5. ✅ Has reasonable performance characteristics

## 🔧 Quality Assurance Process

### 1. Local Development Workflow

#### Basic Build Verification
```bash
# Build and verify
npm run build:verify

# Or execute step by step
npm run build
npm run verify:build
```

#### Run Integration Tests
```bash
# Run build integration tests only
npm run test:e2e

# Run all tests
npm run test:all
```

#### Complete Local Verification
```bash
# Run complete CI workflow
npm run ci
```

### 2. Pre-release Check

#### Automated Pre-release Check
```bash
npm run prerelease
```

This command executes:
- Git status check
- Version number verification
- Complete test suite
- Build verification
- Package content check
- Dependency security check
- Documentation integrity verification

#### Manual Release Check
```bash
# Check package contents
npm pack --dry-run

# Check dependencies
npm audit

# Verify type definitions
npx tsc --noEmit --skipLibCheck dist/index.d.ts
```

## 📋 Verification Checklist

### Build Artifacts Verification

#### File Integrity
- [ ] `dist/index.js` (CommonJS version)
- [ ] `dist/index.mjs` (ESM version)
- [ ] `dist/index.d.ts` (TypeScript declaration file)
- [ ] Reasonable build file sizes (< 5MB)

#### Module Exports
- [ ] CommonJS exports work correctly
- [ ] ESM exports work correctly
- [ ] Default export available
- [ ] All error classes exported

#### TypeScript Declarations
- [ ] Syntax correct declaration files
- [ ] Main types exported
- [ ] Error types exported
- [ ] Complete API coverage

### Runtime Verification

#### Basic Functionality
- [ ] Client instantiation successful
- [ ] API methods accessible
- [ ] Error handling working
- [ ] Streaming functionality working

#### Compatibility Tests
- [ ] Works in Node.js 16+
- [ ] CommonJS import works
- [ ] ESM import works
- [ ] TypeScript integration works

#### Performance
- [ ] Module load time < 1 second
- [ ] Memory usage reasonable
- [ ] No memory leaks

### External Integration

#### Package Manager Compatibility
- [ ] npm install works
- [ ] yarn add works
- [ ] pnpm add works

#### Project Integration
- [ ] Works in new ESM projects
- [ ] Works in new CommonJS projects
- [ ] Works in TypeScript projects
- [ ] Works in existing projects

## 🚨 Common Issues and Solutions

### 1. Build Size Issues

**Problem**: Build file too large
**Solution**:
```bash
# Check bundle analysis
npm run build:analyze

# Verify external dependencies not bundled
npm run verify:externals
```

### 2. Type Definition Issues

**Problem**: TypeScript compilation errors
**Solution**:
```bash
# Verify declaration files
npx tsc --noEmit --skipLibCheck dist/index.d.ts

# Check type exports
npm run verify:types
```

### 3. Module Loading Issues

**Problem**: Cannot resolve modules
**Solution**:
- Check external dependencies in package.json
- Verify require/import statements
- Test in clean environment

### 4. Compatibility Issues

**Problem**: Not working in specific environment
**Solution**:
```bash
# Test in different Node.js versions
npm run test:compatibility

# Test module systems
npm run test:cjs
npm run test:esm
```

## 🔄 CI/CD Integration

### GitHub Actions

Our CI pipeline automatically runs:
1. Linting and type checking
2. Unit tests with coverage
3. Build verification
4. Integration tests
5. Multiple Node.js version tests

### Local Pre-commit

Recommended pre-commit hook:
```bash
#!/bin/sh
npm run lint && npm run type-check && npm run test && npm run build:verify
```

## 📊 Quality Metrics

### Coverage Requirements
- Unit test coverage: > 90%
- Integration test coverage: > 80%
- Type coverage: > 95%

### Performance Benchmarks
- Module load time: < 1000ms
- Memory usage: < 50MB
- Build size: < 5MB

### Compatibility Matrix
- Node.js: 16, 18, 20, 22
- Module systems: CommonJS, ESM
- TypeScript: 4.5+, 5.0+

## 🛠️ Tools and Scripts

### Available Commands
```bash
# Build verification
npm run build:verify

# Integration tests
npm run test:e2e

# Full CI workflow
npm run ci

# Pre-release check
npm run prerelease
```

### Verification Scripts
- `scripts/verify-build.ts` - Build artifacts verification
- `scripts/pre-release-check.ts` - Comprehensive pre-release check
- `tests/integration/build.test.ts` - Integration tests

## 🔍 Debugging Build Issues

### 1. Enable Verbose Logging
```bash
DEBUG=* npm run build:verify
```

### 2. Check Build Output
```bash
# Inspect build files
ls -la dist/
file dist/*

# Check file sizes
du -h dist/*
```

### 3. Test Module Loading
```bash
# Test CommonJS
node -e "console.log(require('./dist/index.js'))"

# Test ESM
node -e "import('./dist/index.mjs').then(console.log)"
```

### 4. Verify Dependencies
```bash
# Check dependency resolution
npm ls
npm audit

# Test in isolated environment
npm pack && mkdir test && cd test && npm init -y && npm install ../package.tgz
```

## 📝 Documentation Requirements

### README Requirements
- [ ] Installation instructions
- [ ] Basic usage examples
- [ ] API reference link
- [ ] License information

### Code Documentation
- [ ] JSDoc comments for public APIs
- [ ] Type definitions for all exports
- [ ] Example code snippets
- [ ] Error handling examples

---

## Summary

This build quality assurance system ensures:
- ✅ Reliable build artifacts
- ✅ Cross-environment compatibility
- ✅ Performance optimization
- ✅ User experience quality

Follow this guide to maintain high quality standards for the Cursor API SDK.
