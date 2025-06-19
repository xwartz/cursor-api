# Authentication Guide

To use the Cursor API SDK, you need two required parameters that must be extracted from Cursor IDE using network interception tools.

## Required Credentials

1. **API Key** (`apiKey`): Your Cursor session token
2. **Checksum** (`checksum`): A unique identifier for request validation

## How to Obtain Your Credentials

### Method 1: Using Charles Proxy (Recommended)

Charles Proxy is a user-friendly HTTP proxy that makes credential extraction straightforward.

#### Setup Charles Proxy

1. **Download and install Charles Proxy** from [charlesproxy.com](https://charlesproxy.com)
2. **Start Charles Proxy**
3. **Configure proxy settings**:
   - Go to `Proxy` → `Proxy Settings`
   - Set HTTP Proxy port to `8888`
   - Enable "Enable transparent HTTP proxying"

#### Configure Cursor IDE

1. **Set proxy in Cursor IDE**:
   - Open Cursor IDE settings
   - Go to network/proxy settings
   - Set HTTP proxy to `127.0.0.1:8888`
   - Set HTTPS proxy to `127.0.0.1:8888`

2. **Install SSL certificate** (for HTTPS traffic):
   - In Charles, go to `Help` → `SSL Proxying` → `Install Charles Root Certificate`
   - Trust the certificate in your system

#### Capture Credentials

1. **Start recording** in Charles Proxy
2. **Make a chat request** in Cursor IDE
3. **Find the API request**:
   - Look for requests to `api2.cursor.sh`
   - Expand the request tree
4. **Extract credentials** from request headers:
   - `Authorization: Bearer [YOUR_API_KEY]`
   - `x-cursor-checksum: [YOUR_CHECKSUM]`

### Method 2: Using Reqable

Reqable = Fiddler + Charles + Postman

#### Setup Reqable

1. **Download Reqable** (https://reqable.com)
2. **Start Reqable**

#### Capture Traffic

1. **Start recording** in Reqable Proxy
2. **Make a chat request** in Cursor IDE
3. **Find the API request**:
   - Look for requests to `api2.cursor.sh`
   - Expand the request tree
4. **Extract credentials** from request headers:
   - `Authorization: Bearer [YOUR_API_KEY]`
   - `x-cursor-checksum: [YOUR_CHECKSUM]`

### Method 3: Using Wireshark

Wireshark captures all network traffic, including Cursor IDE requests.

#### Setup Wireshark

1. **Install Wireshark**
2. **Start capture** on your network interface
3. **Apply filter**: `host api2.cursor.sh`

#### Capture Process

1. **Start Wireshark capture**
2. **Use Cursor IDE** to make a chat request
3. **Stop capture**
4. **Find HTTP requests** to `api2.cursor.sh`
5. **Extract credentials** from HTTP headers

**Note**: This method only works if the traffic is not encrypted or if you have SSL/TLS decryption configured.

### Method 4: Using mitmproxy (Advanced)

For users comfortable with command-line tools:

```bash
# Install mitmproxy
pip install mitmproxy

# Start mitmproxy
mitmproxy -p 8080

# Configure Cursor IDE to use proxy 127.0.0.1:8080
# Make requests and extract credentials from the web interface
```

## Using Your Credentials

Once you have extracted your credentials, use them in your application:

### Environment Variables (Recommended)

```bash
export CURSOR_API_KEY="your-extracted-api-key"
export CURSOR_CHECKSUM="your-extracted-checksum"
```

### Code Usage

```typescript
import { Cursor } from 'cursor-api'

const cursor = new Cursor({
  apiKey: process.env.CURSOR_API_KEY!,
  checksum: process.env.CURSOR_CHECKSUM!,
})

// Use the client
const response = await cursor.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
})
```

### Direct Usage

```typescript
const cursor = new Cursor({
  apiKey: 'your-extracted-api-key',
  checksum: 'your-extracted-checksum',
})
```

## Security Considerations

- **Keep credentials secure**: Never commit credentials to version control
- **Use environment variables**: Store credentials in environment variables or secure configuration
- **Monitor expiration**: Cursor credentials may expire and need to be re-extracted
- **Network security**: When using proxy tools, ensure your network is secure

## Troubleshooting

### Common Issues

1. **SSL/TLS errors**: Ensure proxy certificates are properly installed
2. **No traffic captured**: Verify proxy configuration in Cursor IDE
3. **Credentials not working**: Credentials may have expired, re-extract them
4. **Network interference**: Temporarily disable antivirus/firewall during capture

### Verification

Test your extracted credentials using the debug script:

```bash
export CURSOR_API_KEY="your-api-key"
export CURSOR_CHECKSUM="your-checksum"
npm run debug
```

## Important Notes

- Credentials are session-specific and tied to your Cursor IDE installation
- You may need to re-extract credentials if they expire or when updating Cursor IDE
- Different Cursor IDE installations will have different credentials
- These credentials should not be shared between users

For additional help, see the [FAQ](./FAQ.md) or [Troubleshooting Guide](./FAQ.md#troubleshooting).


