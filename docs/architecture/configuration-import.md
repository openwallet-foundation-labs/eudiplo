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

!!! Environment-Variables

    The list of environment variables is auto-generated from the implementation and published in [Environment Config](./environment-config.md#config).
    Always refer there for the latest and complete configuration options.

## Directory Structure

The configuration import follows a specific directory structure:

```shell
assets/
└── config/
    ├── tenant1/
    │   ├── keys/
    │   │   ├── 039af178-3ca0-48f4-a2e4-7b1209f30376.json  # Key ID: "039af178-3ca0-48f4-a2e4-7b1209f30376"
    │   │   ├── 7d8e9f10-1234-5678-9abc-def012345678.json  # Key ID: "7d8e9f10-1234-5678-9abc-def012345678"
    │   │   └── a1b2c3d4-e5f6-7890-abcd-ef1234567890.json  # Key ID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
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
    │   ├── keys/
    │   │   └── f8e7d6c5-b4a3-9281-7065-432109876543.json  # Key ID: "f8e7d6c5-b4a3-9281-7065-432109876543"
    │   ├── issuance/
    │   │   ├── credentials/
    │   │   └── issuance/
    │   └── presentation/
    └── company-xyz/
        ├── keys/
        │   ├── 12345678-abcd-ef12-3456-789012345678.json  # Key ID: "12345678-abcd-ef12-3456-789012345678"
        │   └── 98765432-fedc-ba98-7654-321098765432.json  # Key ID: "98765432-fedc-ba98-7654-321098765432"
        ├── issuance/
        │   ├── credentials/
        │   └── issuance/
        └── presentation/
```

### Key Points

- **Tenant isolation**: Each tenant has its own folder (e.g., `tenant1`,
  `company-xyz`)
- **Configuration types**: Four types of configurations are supported
- **File naming**: JSON file names become the configuration ID (without `.json`
  extension)
- **Key ID mapping**: For keys, the id is based on the `kid` field in the JSON
  file and not based on the filename.
- **Nested structure**: Credentials and issuance configs are grouped under
  `issuance/`
- **Key management**: Cryptographic keys are stored in the `keys/` directory and
  will be imported automatically. After the import, the keys can be removed from
  the import folder.

## Configuration Types

### 1. Cryptographic Keys

**Location**: `config/config/{tenant}/keys/*.json`

Import cryptographic keys for signing and certificate operations.

**Example Structure**:

```json
{
  "privateKey": {
    "kty": "EC",
    "x": "pmn8SKQKZ0t2zFlrUXzJaJwwQ0WnQxcSYoS_D6ZSGho",
    "y": "rMd9JTAovcOI_OvOXWCWZ1yVZieVYK2UgvB2IPuSk2o",
    "crv": "P-256",
    "d": "rqv47L1jWkbFAGMCK8TORQ1FknBUYGY6OLU1dYHNDqU",
    "kid": "039af178-3ca0-48f4-a2e4-7b1209f30376",
    "alg": "ES256"
  },
  "crt": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
}
```

**Key Features**:

- **Multiple keys per tenant**: Import several keys for different issuance
  configurations
- **Key ID from filename**: The filename (without `.json`) becomes the key ID
  (typically a UUID)
- **Optional certificates**: Include X.509 certificates in PEM format
- **Algorithm support**: ES256 (ECDSA P-256)
- **Validation**: Full schema validation during import

### 2. Credential Configurations

**Location**: `config/config/{tenant}/issuance/credentials/*.json`

Define credential templates and schemas.

**Schema Reference**:
[Credential Config API](https://openwallet-foundation-labs.github.io/eudiplo/main/api/index.html#credentialconfig)

### 3. Issuance Configurations

**Location**: `config/config/{tenant}/issuance/issuance/*.json`

Define issuance workflows and authentication requirements.

**Schema Reference**:
[Issuance Config API](https://openwallet-foundation-labs.github.io/eudiplo/main/api/index.html#issuanceconfig)

### 4. Presentation Configurations

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

**Key import logging**:

```json
{
  "event": "Import",
  "tenant": "company-xyz",
  "message": "3 keys imported for company-xyz"
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
│   ├── keys/
│   ├── issuance/
│   └── presentation/
├── university-x/
│   ├── keys/
│   ├── issuance/
│   └── presentation/
└── government-agency/
    ├── keys/
    ├── issuance/
    └── presentation/
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

**Key validation errors**: Check that imported keys use supported algorithms
(ES256) and have valid JWK format

**Certificate import issues**: Verify certificates are in PEM format and match
the imported private key

## Security Considerations

- **File permissions** - Ensure config files have appropriate read permissions
- **Tenant isolation** - Verify tenant boundaries are properly maintained

> TODO: check if webhook credentials should be stored here or in environment
> variables for security.

## Related Documentation

- [Key Management](./key-management.md) - Detailed key management architecture
- [API Authentication](../api/authentication.md)
- [Multi-tenant Architecture](./tenant.md)
- [Database Architecture](./database.md)
- [Production Deployment](./index.md)
