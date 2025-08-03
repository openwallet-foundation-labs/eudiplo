# Configuration Import

EUDIPLO supports importing configurations from JSON files on application
startup. This feature allows you to pre-configure credentials, issuance
workflows, and presentation verification rules without using the API.

## Overview

The configuration import system automatically loads and validates JSON
configuration files from the `config/config/` directory when the application
starts. This is particularly useful for:

- **Development environments** - Pre-load test configurations
- **Production deployments** - Bootstrap with standard configurations
- **CI/CD pipelines** - Automated environment setup
- **Multi-tenant scenarios** - Bulk import tenant-specific configurations

> When running locally with nodejs, the default directory is `assets/config/`.

## Environment Variables

Configure the import behavior using these environment variables:

| Variable              | Type    | Default          | Description                                                                                     |
| --------------------- | ------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| `CONFIG_IMPORT`       | boolean | `false`          | Enable configuration import on startup                                                          |
| `CONFIG_IMPORT_FORCE` | boolean | `false`          | Overwrite existing configurations with same ID                                                  |
| `CONFIG_FOLDER`       | string  | `assets/config/` | Directory containing configuration files. Will be set in the Dockerfile to `app/config/config/` |

### Examples

```bash
# Enable import (skip existing configs)
CONFIG_IMPORT=true

# Enable import and overwrite existing configs
CONFIG_IMPORT=true
CONFIG_IMPORT_FORCE=true
```

## Directory Structure

The configuration import follows a specific directory structure:

```
assets/
└── config/
    ├── tenant1/
    │   ├── issuance/
    │   │   ├── credentials/
    │   │   │   ├── employee-badge.json
    │   │   │   └── student-id.json
    │   │   └── issuance/
    │   │       ├── employee-onboarding.json
    │   │       └── student-enrollment.json
    │   └── presentation/
    │       ├── age-verification.json
    │       └── identity-check.json
    ├── tenant2/
    │   ├── issuance/
    │   │   ├── credentials/
    │   │   └── issuance/
    │   └── presentation/
    └── company-xyz/
        ├── issuance/
        │   ├── credentials/
        │   └── issuance/
        └── presentation/
```

### Key Points

- **Tenant isolation**: Each tenant has its own folder (e.g., `tenant1`,
  `company-xyz`)
- **Configuration types**: Three types of configurations are supported
- **File naming**: JSON file names become the configuration ID (without `.json`
  extension)
- **Nested structure**: Credentials and issuance configs are grouped under
  `issuance/`

## Configuration Types

### 1. Credential Configurations

**Location**: `config/config/{tenant}/issuance/credentials/*.json`

Define credential templates and schemas.

**Schema Reference**:
[Credential Config API](https://openwallet-foundation-labs.github.io/eudiplo/main/api/index.html#credentialconfig)

### 2. Issuance Configurations

**Location**: `config/config/{tenant}/issuance/issuance/*.json`

Define issuance workflows and authentication requirements.

**Schema Reference**:
[Issuance Config API](https://openwallet-foundation-labs.github.io/eudiplo/main/api/index.html#issuanceconfig)

### 3. Presentation Configurations

**Location**: `config/config/{tenant}/presentation/*.json`

Define verification requirements for credential presentations.

**Schema Reference**:
[Presentation Config API](https://openwallet-foundation-labs.github.io/eudiplo/main/api/index.html#presentationconfig)

## Import Process

### 1. Startup Validation

During application startup, EUDIPLO:

1. **Checks environment variables** - Only imports if `CONFIG_IMPORT=true`
2. **Scans tenant directories** - Processes each tenant folder independently
3. **Validates file structure** - Ensures required subdirectories exist
4. **Reads JSON files** - Parses each configuration file

### 2. Validation and Processing

For each configuration file:

1. **JSON parsing** - Validates file syntax
2. **Schema validation** - Uses the same validators as the API endpoints
3. **Dependency checking** - Verifies referenced configurations exist
4. **Duplicate handling** - Respects `CONFIG_IMPORT_FORCE` setting

### 3. Error Handling

Invalid configurations are handled gracefully:

- **Validation errors** are logged with detailed information
- **Invalid files are skipped** - Import continues with remaining files
- **Missing dependencies** are reported
- **Existing configurations** are preserved unless force mode is enabled

## Logging

Import activities are logged with structured information:

```json
{
    "event": "Import",
    "tenant": "company-xyz",
    "files": 5,
    "message": "5 credential configs imported for company-xyz"
}
```

**Error logging** includes detailed validation information:

```json
{
    "event": "ValidationError",
    "file": "invalid-config.json",
    "tenant": "company-xyz",
    "errors": [
        {
            "property": "credentialConfigs",
            "constraints": { "isArray": "credentialConfigs must be an array" },
            "value": "not-an-array"
        }
    ]
}
```

## Best Practices

### 1. Configuration Management

- **Use descriptive filenames** that reflect the configuration purpose
- **Test configurations** in development before deploying
- **Document tenant-specific configurations**

### 2. Production Deployment

- **Set `CONFIG_IMPORT=true`** only for initial deployment
- **Use `CONFIG_IMPORT_FORCE=false`** to prevent accidental overwrites
- **Monitor logs** for validation errors during startup
- **Manage configurations via API** after initial import

### 3. Multi-Tenant Setup

```bash
# Organize by tenant/organization
assets/config/
├── acme-corp/
├── university-x/
└── government-agency/
```

Even when you just have one tenant, use a folder structure to prepare for future
multi-tenancy.

## Troubleshooting

### Common Issues

**Import not running**: Check `CONFIG_IMPORT=true` is set

**Configurations not updating**: Set `CONFIG_IMPORT_FORCE=true` to overwrite
existing

**Validation errors**: Check logs for specific validation failures and schema
requirements

**Missing dependencies**: Ensure credential configs are imported before issuance
configs that reference them

## Security Considerations

- **File permissions** - Ensure config files have appropriate read permissions
- **Tenant isolation** - Verify tenant boundaries are properly maintained

> TODO: check if webhook credentials should be stored here or in environment
> variables for security.

## Related Documentation

- [API Authentication](../api/authentication.md)
- [Multi-tenant Architecture](./tenant.md)
- [Database Architecture](./database.md)
- [Production Deployment](./overview.md)
