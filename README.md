# Cursor API Monorepo

This repository contains TypeScript libraries and tools for working with the Cursor API.

[![CI](https://github.com/xwartz/cursor-api/workflows/CI/badge.svg)](https://github.com/xwartz/cursor-api/actions)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

## Packages

This monorepo contains the following packages:

- [`cursor-api`](./packages/cursor-api/README.md): TypeScript library for interacting with the Cursor API
- [`cursor-cli`](./packages/cursor-cli/README.md): CLI tools for Cursor IDE

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/xwartz/cursor-api.git
cd cursor-api

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development Workflow

```bash
# Run tests
pnpm test

# Run linting
pnpm lint

# Run type checking
pnpm type-check

# Extract Cursor token
pnpm get-token
```

## Project Structure

```
cursor-api/
├── packages/
│   ├── cursor-api/        # Main API library
│   └── cursor-cli/        # CLI tools
├── e2e/                   # End-to-end tests
└── .github/               # GitHub workflows
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure your code passes all tests, linting, and type checking before submitting a PR.

## Publishing

Packages are published to npm using the following workflow:

1. Changes are merged to the `main` branch
2. The CI/CD pipeline runs tests and builds the packages
3. Packages are published to npm with the appropriate version

To manually publish packages:

```bash
# Publish all packages
pnpm run release

# Publish a specific package
cd packages/cursor-cli
pnpm publish
```

## License

MIT
