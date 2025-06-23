# Cursor Tool

Command-line tools for Cursor IDE.

## Features

- **Token Extraction**: Extract authentication tokens and checksums from local Cursor installation

## Installation

### Global Installation

```bash
npm install -g cursor-tool
```

### Local Installation

```bash
npm install cursor-tool
```

## Usage

### Token Extraction

```bash
# If installed globally
cursor-tool token

# If installed locally
npx cursor-tool token
```

### Programmatic Usage

```typescript
import { getCursorTokenInfo } from 'cursor-tool'

const tokenInfo = getCursorTokenInfo()
console.log(tokenInfo.token)
console.log(tokenInfo.checksum)
```

## What It Does

The token extraction tool:

1. Locates the Cursor data directory based on your operating system
2. Extracts the access token from the SQLite database
3. Retrieves machine IDs from the storage.json file
4. Generates the proper checksum required for API authentication

## Supported Platforms

- Windows
- macOS
- Linux

## Output

The token tool outputs:

- Access Token
- Checksum
- Machine ID
- MAC Machine ID

## License

MIT
