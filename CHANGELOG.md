# 1.0.0 (2025-06-19)


### Bug Fixes

* package contents check in pre-release script ([#3](https://github.com/xwartz/cursor-api/issues/3)) ([17f9184](https://github.com/xwartz/cursor-api/commit/17f9184aec1564184c1a2f48f61d6d78214df59a))
* semantic-release GitHub permissions and configuration ([#4](https://github.com/xwartz/cursor-api/issues/4)) ([f0a05c4](https://github.com/xwartz/cursor-api/commit/f0a05c4df77f0188e447ceba5ca613615f71012d))


### Features

* complete TypeScript SDK for Cursor API with streaming support,multi-model compatibility, comprehensive testing, and production-ready developer experience ([#1](https://github.com/xwartz/cursor-api/issues/1)) ([3211e90](https://github.com/xwartz/cursor-api/commit/3211e9086fb9b4aca7a8f38c07ccd76a77a7b0c4))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-06-18

### Added
- ✨ Complete TypeScript SDK for Cursor API
- 🚀 OpenAI-compatible API interface
- 📡 Streaming support for real-time responses
- 🔄 Automatic retry logic with exponential backoff
- 🧪 Comprehensive test suite with Jest
- 📦 Modern dual ESM/CJS package distribution
- 🔧 Full TypeScript type definitions
- 📚 Complete documentation and examples
- 🛠️ CI/CD pipeline with GitHub Actions
- 🎯 Error handling with detailed error types
- 🌊 Stream processing utilities
- 🔐 Protocol buffer encoding/decoding
- ⚡ High-performance binary data handling

### Features
- Chat completions API compatible with OpenAI format
- Support for multiple AI models (GPT, Claude, Gemini, DeepSeek, etc.)
- Streaming responses with async iterators
- Request timeout and abort signal support
- Custom headers and request options
- Automatic session token rotation
- Response text cleaning and formatting
- Type-safe request/response handling

### Developer Experience
- Full TypeScript support with strict typing
- Comprehensive JSDoc documentation
- Modern development toolchain (tsup, ESLint, Prettier)
- Automated testing and code coverage
- Example usage in multiple scenarios
- Contributing guidelines and code of conduct

### Dependencies
- protobufjs: Protocol buffer handling
- uuid: Unique identifier generation
- Node.js 18+ compatibility
- Zero runtime dependencies beyond core libraries
