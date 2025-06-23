# Contributing to Cursor API SDK

Thank you for your interest in contributing to the Cursor API SDK! This document provides guidelines and information for contributors.

## 🚀 Quick Start for Contributors

### 1. Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/cursor-api.git
   cd cursor-api
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up your credentials**

   ```bash
   export CURSOR_API_KEY="your-extracted-api-key"
   export CURSOR_CHECKSUM="your-extracted-checksum"
   ```

4. **Run tests to ensure everything works**
   ```bash
   pnpm test
   ```

### 2. Development Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   - Write your code
   - Add tests
   - Update documentation

3. **Test your changes**

   ```bash
   pnpm run test
   pnpm run type-check
   pnpm run lint
   ```

4. **Commit and push**

   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**

## 📝 Code Style Guidelines

### TypeScript Style

We follow strict TypeScript guidelines with the latest version (5.6+):

```typescript
// ✅ Good
interface UserData {
  id: string
  name: string
  email?: string
}

async function fetchUser(id: string): Promise<UserData | null> {
  try {
    const response = await api.get(`/users/${id}`)
    return response.data
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return null
  }
}

// ❌ Avoid
function fetchUser(id: any): any {
  // implementation
}
```

### Code Formatting

- Use **2 spaces** for indentation
- Use **single quotes** for strings
- **No semicolons** (configured in Prettier)
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes and interfaces

### ESLint Configuration

We use ESLint 9.0+ with flat config format:

```javascript
// eslint.config.js
const typescriptParser = require('@typescript-eslint/parser')

module.exports = [
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'tests/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'off', // Handled by TypeScript
      'no-undef': 'off', // Handled by TypeScript
      'no-dupe-class-members': 'off', // Allow method overloads
    },
  },
]
```

### Development Dependencies

Current major versions:

- **TypeScript**: `^5.6.0`
- **ESLint**: `^9.0.0`
- **Jest**: `^30.0.0`
- **Node Types**: `^22.0.0`
- **ts-jest**: `^29.2.5`

### Comments and Documentation

````typescript
/**
 * Creates a chat completion request
 *
 * @param params - The completion parameters
 * @param options - Additional request options
 * @returns Promise resolving to the completion response
 *
 * @example
 * ```typescript
 * const response = await cursor.chat.completions.create({
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Hello' }]
 * })
 * ```
 */
async function createCompletion(
  params: ChatCompletionCreateParams,
  options?: RequestOptions
): Promise<ChatCompletion> {
  // Implementation
}
````

## 🧪 Testing Guidelines

### Writing Tests

We use Jest for testing. All new features should include tests:

```typescript
// tests/new-feature.test.ts
import { Cursor } from '../src/client'

describe('New Feature', () => {
  let cursor: Cursor

  beforeEach(() => {
    cursor = new Cursor({
      apiKey: 'test-key',
      checksum: 'test-checksum',
    })
  })

  test('should work correctly', async () => {
    // Arrange
    const input = {
      /* test data */
    }

    // Act
    const result = await cursor.someMethod(input)

    // Assert
    expect(result).toBeDefined()
    expect(result.success).toBe(true)
  })

  test('should handle errors gracefully', async () => {
    // Test error scenarios
    await expect(cursor.someMethod(invalidInput)).rejects.toThrow()
  })
})
```

### Test Types

1. **Unit Tests** - Test individual functions/methods
2. **Integration Tests** - Test API interactions
3. **E2E Tests** - Test complete workflows

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage

# Run specific test file
pnpm test -- new-feature.test.ts
```

## 📚 Documentation Guidelines

### README Updates

When adding new features, update the README.md:

1. Add feature to the feature list
2. Include usage examples
3. Update API documentation links

### Code Documentation

- Use JSDoc comments for all public APIs
- Include examples in documentation
- Keep examples up-to-date

### Writing Style

- Use clear, concise English
- Use active voice
- Include practical examples
- Use proper markdown formatting

## 🔀 Git Workflow

### Commit Messages

Follow the [Conventional Commits](https://conventionalcommits.org/) specification:

```bash
# Features
git commit -m "feat: add streaming support for chat completions"

# Fixes
git commit -m "fix: handle rate limit errors gracefully"

# Documentation
git commit -m "docs: update README with new examples"
```

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `test/description` - Test improvements
- `refactor/description` - Code refactoring

### Pull Request Guidelines

1. **Clear Title** - Describe what the PR does
2. **Detailed Description** - Explain the changes and why
3. **Link Issues** - Reference related issues
4. **Add Screenshots** - For UI changes
5. **Update Tests** - Ensure tests pass
6. **Update Docs** - Update relevant documentation

**PR Template:**

```markdown
## Description

Brief description of changes

## Changes Made

- [ ] Feature A implemented
- [ ] Bug B fixed
- [ ] Tests added
- [ ] Documentation updated

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Breaking Changes

List any breaking changes

## Additional Notes

Any additional information
```

## 🏗️ Project Structure

Understanding the project structure helps with contributions:

```
cursor-api/
├── src/
│   ├── client.ts          # Main SDK client
│   ├── core/              # Core functionality
│   │   ├── api.ts         # HTTP client
│   │   ├── errors.ts      # Error definitions
│   │   └── streaming.ts   # Streaming support
│   ├── lib/               # Utility libraries
│   │   └── protobuf.ts    # Protocol buffer handling
│   ├── resources/         # API resources
│   │   └── chat/          # Chat API
│   ├── types/             # TypeScript types
├── tests/                 # Test files
├── docs/                  # Documentation
└── scripts/               # Build/utility scripts
```

## 🐛 Reporting Issues

### Before Reporting

1. **Search existing issues** - Check if it's already reported
2. **Try latest version** - Update to the latest version
3. **Check documentation** - Review docs and FAQ

### Issue Template

```markdown
## Bug Description

Clear description of the bug

## Steps to Reproduce

1. Step one
2. Step two
3. Expected vs actual result

## Environment

- OS: macOS/Windows/Linux
- Node.js version:
- SDK version:
- Cursor IDE version:

## Additional Context

Screenshots, error logs, etc.
```

## 🎯 Areas for Contribution

### High Priority

- **Bug fixes** - Fix reported issues
- **Documentation** - Improve guides and examples
- **Tests** - Increase test coverage
- **Performance** - Optimize API calls

### Medium Priority

- **New features** - Implement requested features
- **Developer tools** - Improve debugging tools
- **Examples** - Add more usage examples

### Low Priority

- **Code quality** - Refactoring and cleanup
- **Build tools** - Improve development experience

## 🔍 Code Review Process

### For Contributors

1. **Self-review** - Review your own code first
2. **Test thoroughly** - Ensure all tests pass
3. **Update docs** - Keep documentation current
4. **Address feedback** - Respond to review comments

### For Reviewers

1. **Be constructive** - Provide helpful feedback
2. **Check tests** - Ensure adequate test coverage
3. **Verify docs** - Check documentation updates
4. **Test manually** - Try the changes locally

## 🚀 Release Process

This project uses [Changesets](https://github.com/changesets/changesets) to manage releases. The release process is automated through GitHub Actions.

### How it Works

1.  **Add a Changeset**: When you make a change that should be included in the next release, you need to add a "changeset". This is a file that describes the change.

    ```bash
    pnpm changeset
    ```

    This command will prompt you to select the packages that have been changed, the type of change (major, minor, or patch), and to provide a description of the change.

2.  **Commit the Changeset**: Commit the generated markdown file in the `.changeset` directory along with your code changes.

3.  **Create a Pull Request**: Push your changes and create a pull request. The Changesets bot will comment on the PR to confirm that a changeset has been included.

4.  **Versioning and Publishing**: When your PR is merged into the `main` branch, the `changesets-action` will automatically:
    - Create a "Version Packages" pull request that updates the versions of the changed packages and their changelogs.
    - When the "Version Packages" PR is merged, the action will publish the new package versions to npm.

## 🤝 Getting Help

If you have questions or need help, please:

- **Open an issue** for bug reports or feature requests
- **Start a discussion** for general questions

---

Thank you for contributing!

## 🎉 Recognition

Contributors are recognized in:

- **README.md** - Contributors section
- **CHANGELOG.md** - Release notes
- **GitHub** - Contributor stats

## 📋 Contribution Checklist

Before submitting a contribution:

- [ ] Code follows style guidelines
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] Commit messages follow convention
- [ ] PR description is complete
- [ ] No breaking changes (or marked as such)
- [ ] Issue is linked (if applicable)

## 🙏 Thank You

Your contributions make this project better for everyone. Thank you for taking the time to contribute!

---

For questions about contributing, please create an issue or start a discussion on GitHub.
