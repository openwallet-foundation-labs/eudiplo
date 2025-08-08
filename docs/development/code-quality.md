# Code Quality Standards

This project uses [Biome](https://biomejs.dev/) for code formatting, linting, and import organization to ensure consistent code quality across the codebase.

## Biome Configuration

Biome has replaced ESLint and Prettier in this project for better performance and a unified tooling experience. The configuration is defined in `biome.json` at the project root.

### Key Settings

- **Semicolons**: Always required (`"always"`)
- **Indentation**: 4 spaces
- **Quote Style**: Double quotes preferred
- **Line Width**: 80 characters
- **Parameter Decorators**: Enabled for NestJS compatibility (`unsafeParameterDecoratorsEnabled: true`)

## Available Commands

```bash
# Format all files
pnpm run format

# Check formatting without making changes
pnpm run format:check

# Run linting checks
pnpm run lint

# Fix linting issues automatically
pnpm run lint:fix
```

## IDE Setup

### VS Code (Recommended)

1. **Install the Biome extension**:

   ```
   Extension ID: biomejs.biome
   ```

2. **Workspace settings are pre-configured** in `.vscode/settings.json`:
   - Format on save enabled
   - Biome set as default formatter
   - Auto-organize imports on save
   - Quick fixes applied automatically

### Other Editors

For other editors, refer to the [Biome Editor Integration](https://biomejs.dev/guides/integrate-in-editor/) guide.

## File Coverage

Biome processes the following file types:

- TypeScript files: `src/**/*.ts`, `test/**/*.ts`, `src/**/*.spec.ts`
- JavaScript files: `*.js`, `*.mjs`
- JSON files: `*.json`, `*.jsonc`

## Pre-commit Hooks

Consider setting up pre-commit hooks to automatically format and lint code:

```bash
# Example using husky + lint-staged
pnpm add -D husky lint-staged

# In package.json
"lint-staged": {
  "*.{ts,js,json}": ["pnpm run format", "pnpm run lint:fix"]
}
```

## Code Style Guidelines

### TypeScript/JavaScript

- Use explicit types where beneficial for readability
- Prefer `const` over `let` when variables don't change
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Destructure objects when accessing multiple properties

### NestJS Specific

- Use parameter decorators (e.g., `@Body()`, `@Param()`)
- Organize imports: external packages, then internal modules
- Use dependency injection consistently
- Follow NestJS naming conventions for controllers, services, modules

### Example

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service for managing user authentication.
 */
@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Validates user credentials.
   * @param email User's email address
   * @param password User's password
   * @returns Authentication result
   */
  async validateUser(email: string, password: string): Promise<boolean> {
    const isValid = await this.checkCredentials(email, password);
    return isValid;
  }
}
```

## Migration from ESLint/Prettier

This project recently migrated from ESLint and Prettier to Biome for:

- **Better Performance**: ~20x faster than ESLint
- **Unified Tooling**: Single tool for formatting and linting
- **Zero Configuration**: Works out of the box with sensible defaults
- **Better Error Messages**: More helpful diagnostics

If you have old ESLint or Prettier configurations in your editor, make sure to disable them for this project to avoid conflicts with Biome.
