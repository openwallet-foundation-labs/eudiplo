# E2E Test Configuration Setup

This directory contains utilities for setting up configuration files before running e2e tests.

## How it works

The test setup imports configuration files from the following directories into your test application:

1. `scripts/issuance/credentials` → `/issuer-management/credentials`
2. `scripts/issuance/issuance` → `/issuer-management/issuance`  
3. `scripts/presentation` → `/presentation-management`

## Files

- `setup.ts` - Core utility for importing configuration files
- `global-setup.ts` - Optional Vitest global setup (not currently used)
- `vitest.config.ts` - Test configuration

## Configuration

You can customize the setup using environment variables:

```bash
# Server URL where configs should be imported (default: http://localhost:3000)
TEST_SERVER_URL=http://localhost:3000

# Authentication credentials (defaults: root/root)
TEST_CLIENT_ID=root
TEST_CLIENT_SECRET=root
```

## Usage

### Automatic (Recommended)

Each e2e test automatically imports configurations in its `beforeAll` setup:

```typescript
import { importConfigsForApp } from './setup';

beforeAll(async () => {
    // ... create and initialize app ...
    
    // Import configurations after app is ready
    await importConfigsForApp(app, clientId, clientSecret);
});
```

### Manual (for custom scenarios)

You can also import configurations manually:

```typescript
import { setupTestConfigs, getTestImporter } from './setup';

// For external server
await setupTestConfigs('http://localhost:3000', 'root', 'root');

// For custom configuration
const importer = getTestImporter();
await importer?.importConfigs('http://different-server:3000');
```

### Testing the setup independently

To test the configuration import without running e2e tests:

```bash
# Test with default settings
npx tsx test/test-setup-ts.ts

# Test with custom server
npx tsx test/test-setup-ts.ts http://localhost:3001 myClientId mySecret
```

## Running Tests

```bash
# Run e2e tests with coverage (recommended)
npm run test:e2e
# or with pnpm
pnpm test:e2e

# Run e2e tests in watch mode
npm run test:e2e:watch
# or with pnpm  
pnpm test:e2e:watch
```

## Error Handling

- If credential import fails, the process stops (since issuance configs depend on credentials)
- Failed imports are logged but don't stop other imports
- The global setup will throw an error if critical imports fail, preventing tests from running

## Dependencies

The import process respects dependencies:
1. **Credentials** must be imported first (other configs reference them)
2. **Issuance configurations** can be imported after credentials
3. **Presentations** can be imported independently

## Troubleshooting

1. **Authentication errors**: Check your `TEST_CLIENT_ID` and `TEST_CLIENT_SECRET`
2. **Connection errors**: Ensure your test server is running on `TEST_SERVER_URL`
3. **Missing files**: Verify JSON files exist in the expected directories
4. **Import failures**: Check server logs for detailed error messages

## Development

To modify the import logic:

1. Edit `setup.ts` for core import functionality
2. Edit `global-setup.ts` for test lifecycle integration
3. Add new import configurations to the `importConfigs` array in `TestConfigImporter.importConfigs()`
