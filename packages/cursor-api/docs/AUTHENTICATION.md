# Authentication Guide

This guide explains how to authenticate with the Cursor API.

## Authentication Requirements

The Cursor API requires two authentication parameters:

1. **API Key** (Token): A JWT token that authenticates your requests
2. **Checksum**: A validation string that includes your machine identifiers

## Using cursor-tool (Recommended)

The easiest way to get your authentication credentials is using the `cursor-tool` tool:

```bash
# Install the CLI tool
npm install -g cursor-tool

# Extract your token and checksum
cursor-tool token
```

This will output your token and checksum, which you can use to initialize the API client.

## Manual Extraction Methods

If you prefer to extract the credentials manually, you can use one of the following methods:

### Method 1: Inspect Cursor's Local Files

The Cursor IDE stores authentication information in local files:

1. **Token**: Stored in a SQLite database (`state.vscdb`)
2. **Machine IDs**: Stored in `storage.json`

The location of these files depends on your operating system:

- **Windows**: `%APPDATA%\Cursor\User\globalStorage\`
- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/`
- **Linux**: `~/.config/Cursor/User/globalStorage/`

### Method 2: Network Inspection

You can also extract credentials by inspecting network requests made by Cursor IDE:

1. Install a proxy tool like [Charles Proxy](https://www.charlesproxy.com/) or [Fiddler](https://www.telerik.com/fiddler)
2. Configure Cursor IDE to use your proxy
3. Make a request in Cursor IDE that triggers an API call
4. Look for requests to `api2.cursor.sh`
5. Extract the following headers:
   - `Authorization: Bearer [YOUR_API_KEY]`
   - `x-cursor-checksum: [YOUR_CHECKSUM]`

## Using Authentication in Your Code

Once you have your authentication credentials, you can use them to initialize the API client:

```typescript
import { Cursor } from 'cursor-api'

const cursor = new Cursor({
  apiKey: 'your-cursor-session-token',
  checksum: 'your-cursor-checksum',
})

// Now you can make API calls
const completion = await cursor.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
})
```

## Best Practices for Authentication

1. **Use Environment Variables**: Store your credentials in environment variables instead of hardcoding them

   ```typescript
   const cursor = new Cursor({
     apiKey: process.env.CURSOR_API_KEY!,
     checksum: process.env.CURSOR_CHECKSUM!,
   })
   ```

2. **Refresh Tokens**: Cursor tokens can expire. Implement a mechanism to refresh them when needed.

3. **Secure Storage**: If you need to store credentials, use secure storage mechanisms appropriate for your platform.

4. **Error Handling**: Implement proper error handling for authentication failures:

   ```typescript
   import { AuthenticationError } from 'cursor-api'

   try {
     // API calls
   } catch (error) {
     if (error instanceof AuthenticationError) {
       // Handle authentication error
       console.error('Authentication failed. Please refresh your credentials.')
     }
   }
   ```

## Troubleshooting

If you encounter authentication issues:

1. **Token Expired**: Cursor tokens can expire. Extract a new token using `cursor-tool`.
2. **Invalid Checksum**: Make sure you're using the correct checksum that matches your machine IDs.
3. **Network Issues**: Ensure your network allows connections to Cursor API endpoints.

For persistent issues, check the [FAQ](./FAQ.md) or open an issue on GitHub.
