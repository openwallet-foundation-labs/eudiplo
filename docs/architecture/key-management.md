# Key Management

The keys used for **signing operations** in EUDIPLO can be managed by one or
more KMS (Key Management System) providers running simultaneously. Providers are
configured in a single `kms.json` file inside the config folder.

> 💡 **Encryption operations** always use database-stored keys and are independent from the KMS providers configured for signing.

## Configuration

KMS providers are configured in `<CONFIG_FOLDER>/kms.json`. If no file is found,
a single `db` provider is registered automatically.

```json
{
    "defaultProvider": "db",
    "providers": {
        "db": {},
        "vault": {
            "vaultUrl": "http://localhost:8200",
            "vaultToken": "your-vault-token"
        }
    }
}
```

| Field             | Description                                                                            |
| ----------------- | -------------------------------------------------------------------------------------- |
| `defaultProvider` | Name of the provider used when no explicit `kmsProvider` is specified (default: `db`). |
| `providers`       | Object where each key is a provider name and the value is its configuration.           |

Environment-variable placeholders (`${VAULT_URL}`, `${VAULT_TOKEN:default}`) are
resolved at startup, so secrets can still be injected through the environment.

When generating or importing a key through the API, include the `kmsProvider`
field to select a specific provider. If omitted, the `defaultProvider` is used.

---

## Database Key Management (`db`)

When the `db` provider is configured (the default), keys are stored encrypted in the
database. This mode is ideal for development or testing.

### Multiple Key Support

Each tenant can manage multiple cryptographic keys simultaneously. Each key has a unique key id and is also isolated via the `tenant_id` field.

Each key file contains the private key in JWK format:

```json
{
    "kty": "EC",
    "x": "pmn8SKQKZ0t2zFlrUXzJaJwwQ0WnQxcSYoS_D6ZSGho",
    "y": "rMd9JTAovcOI_OvOXWCWZ1yVZieVYK2UgvB2IPuSk2o",
    "crv": "P-256",
    "d": "rqv47L1jWkbFAGMCK8TORQ1FknBUYGY6OLU1dYHNDqU",
    "kid": "039af178-3ca0-48f4-a2e4-7b1209f30376",
    "alg": "ES256"
}
```

### Automatic Key Generation

On startup, if no keys are found for a tenant, the service will automatically
generate a new key pair. Even when using the database mode, the private key will never be exposed by the api.

---

## Vault (HashiCorp Vault)

To use [HashiCorp Vault](https://www.vaultproject.io/) for key management,
add a `vault` entry to the `providers` section of `kms.json`:

```json
{
    "defaultProvider": "vault",
    "providers": {
        "db": {},
        "vault": {
            "vaultUrl": "http://localhost:8200",
            "vaultToken": "your-vault-token"
        }
    }
}
```

| Field        | Description                                     |
| ------------ | ----------------------------------------------- |
| `vaultUrl`   | Base URL of the Vault server (without `/v1/…`). |
| `vaultToken` | Authentication token for Vault API access.      |

You can use environment-variable placeholders to avoid storing secrets in the
config file:

```json
{
    "vaultUrl": "${VAULT_URL}",
    "vaultToken": "${VAULT_TOKEN}"
}
```

### Transit Mount Auto-Creation

For each tenant, a **transit secret engine** mount is created automatically on
first use. If the mount already exists the creation step is silently skipped
(idempotent). If a Vault API call returns **404** (mount not found), the service
retries the operation once after creating the mount.

To issue credentials, you need to have a signed certificate for the public key
that is bound to your domain.

In this mode:

- All **signing operations** are delegated to Vault via its API.
- The **private key never leaves** the Vault server.
- A **stub key entity** is stored in the database for tracking purposes (no
  private key material).
- Access can be tightly controlled using Vault's policies and authentication
  mechanisms.

Vault is well-suited for production environments where secure, auditable key
usage is required.

---

## Extensibility

The key management system is designed to be **extensible**. You can integrate
other key management backends such as:

- 🔐 AWS KMS
- 🔐 Azure Key Vault
- 🔐 Google Cloud KMS
- 🔐 Hardware Security Modules (HSMs)

To add a new backend:

1. Create a new class extending `KmsAdapter` (see `vault-key.service.ts` for
   reference).
2. Register a factory function for the new type in `kms-adapter.factory.ts`.
3. Add the provider entry to `kms.json`:

```json
{
    "providers": {
        "awskms": {
            "region": "eu-central-1",
            "keyArn": "arn:aws:kms:..."
        }
    }
}
```

If you need help integrating a new provider, feel free to open an issue or
contact the maintainers.

---

## Certificates

EUDIPLO supports comprehensive management of X.509 certificates that are linked to cryptographic keys. Certificates can be used to verify the authenticity of public keys and establish trust between parties.

### Certificate Management

Certificates are managed separately from keys and can be associated with any imported key. Each certificate has a unique identifier and is linked to a key via the `keyId` field.

**Certificate Types**:

- **Access Certificates** (`isAccessCert`): Used for authenticating access to protected resources
- **Signing Certificates** (`isSigningCert`): Used for signing credentials and tokens

A single certificate can serve both purposes by setting both flags to `true`.

### Certificate Operations

The certificate management API provides endpoints for creating, reading, updating, and deleting certificates. For detailed endpoint specifications, parameters, and request/response schemas, see:

**API Reference**: [Certificate API Endpoints](../api/openapi.md#tag/cert)

Available operations:

- List all certificates for a tenant
- Get certificate details by ID
- Create/Import certificate for a specific key
- Update certificate metadata and type flags
- Delete certificate
- Generate self-signed certificate for a key

### Self-Signed Certificate Generation

Generate a self-signed certificate for an existing key using the dedicated endpoint. This automatically creates a certificate with:

- Subject: Common Name based on tenant configuration
- Validity: 1 year from generation
- Algorithm: Matches the key algorithm (ES256)
- Extensions: Subject Alternative Name (SAN) for localhost

**API Reference**: [Self-Signed Certificate Generation](../api/openapi.md#tag/cert/POST/cert/{keyId})

### Certificate Import via Configuration

Certificates can be imported during application startup using the configuration system.

**Directory Structure**:

```shell
assets/config/
└── tenant-1/
    └── certs/
        ├── signing-cert.json
        └── access-cert.json
```

**Certificate File Format**:

```json
{
    "keyId": "039af178-3ca0-48f4-a2e4-7b1209f30376",
    "isAccessCert": true,
    "isSigningCert": true,
    "description": "Production certificate",
    "crt": "-----BEGIN CERTIFICATE-----\nMIIBYTCCAQigAwIB...\n-----END CERTIFICATE-----"
}
```

See [Configuration Import](configuration-import.md#certificates) for more details.

### Certificate Chain Support

EUDIPLO supports certificate chains for establishing trust hierarchies. Import multiple certificates and link them to the same key to build a chain from leaf to root certificate.

### Certificate Validation

Certificates are validated during import:

- PEM format verification
- Public key matching with associated key
- Certificate expiration checking
- X.509 standard compliance

### Certificate Format

Certificates must be in PEM format with proper line breaks:

- Use `\n` escape sequences in JSON
- Include both `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` headers
- Base64-encoded DER content between headers

When a new key pair is generated, a self-signed certificate is also created. This certificate includes the public key and is stored alongside the key files. The certificate can be overwritten any time via the API.

When using the [Registrar](../getting-started/registrar.md), it will generate a certificate for the public key that can be used to secure the OID4VCI and OID4VP requests. Each tenant will only have one access certificate.

> Note: In the future the access certificate generation will follow the official standard that is under development right now.

---

## Multi-Tenant Key Management

### Automatic Key Generation

**Tenant Initialization Process:**

1. Client registers with credentials (`client_id`, `client_secret`)
2. Cryptographic key pair automatically generated
3. Keys stored in tenant-specific location
4. Generation of certificate for public key

## Key Import and Management

EUDIPLO supports importing existing keys through multiple methods to accommodate
different deployment scenarios and security requirements.

The `kid` provided in the key files is used to identify and manage keys within the system. An optional `description` field can be included for additional context.

### API-Based Key Import

Import keys through the REST API using authenticated requests:

**Endpoint**: `POST /key`

**Request Body**:

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
    "description": "Optional key description",
    "crt": "-----BEGIN CERTIFICATE-----\n...optional certificate...\n-----END CERTIFICATE-----"
}
```

**Response**:

```json
{
    "id": "039af178-3ca0-48f4-a2e4-7b1209f30376"
}
```

### Configuration-Based Key Import

Import keys automatically during application startup using the configuration
import system.

**Environment Variables**:

```bash
CONFIG_IMPORT=true
CONFIG_IMPORT_FORCE=false  # Set to true to overwrite existing keys
```

**Directory Structure**:

```shell
assets/config/
├── tenant-1/
│   └── keys/
│       ├── primary-key.json
│       ├── backup-key.json
│       └── legacy-key.json
└── tenant-2/
    └── keys/
        └── signing-key.json
```

**Key File Format**:

```json
{
    "privateKey": {
        "kty": "EC",
        "x": "...",
        "y": "...",
        "crv": "P-256",
        "d": "...",
        "kid": "unique-key-identifier",
        "alg": "ES256"
    },
    "crt": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
}
```

### Key Management Operations

For detailed key management endpoints, parameters, and request/response schemas, see:

**API Reference**: [Key Management API Endpoints](../api/openapi.md#tag/key)

Available operations include listing keys, importing keys, and managing key metadata.

### Supported Key Formats

- **Algorithm Support**: ES256 (ECDSA P-256)
- **Key Format**: JSON Web Key (JWK) format
- **Certificate Support**: Optional X.509 certificates in PEM format
- **Key Generation**: Automatic generation if no keys exist
