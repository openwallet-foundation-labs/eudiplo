# Key Management

The keys used for **signing operations** in EUDIPLO can be managed in multiple
ways, depending on the selected key management type (`KM_TYPE`).

> 💡 **Encryption operations** are always proceed with database stored keys for not and independent from the used KeyManagement Module.

---

## Configuration Overview

| Variable              | Description                                              | Required for | Default |
| --------------------- | -------------------------------------------------------- | ------------ | ------- |
| `KM_TYPE`             | Key management engine type (`db` or `vault`)             | All          | `db`    |
| `CRYPTO_ALG`          | Cryptographic algorithm (`ES256`)                        | All          | `ES256` |
| `VAULT_URL`           | Vault API URL to vault instance like `http://vault:8200` | `vault`      | –       |
| `VAULT_TOKEN`         | Authentication token for Vault                           | `vault`      | –       |
| `CONFIG_IMPORT`       | Enable automatic key import from config files            | Optional     | `false` |
| `CONFIG_IMPORT_FORCE` | Overwrite existing keys during import                    | Optional     | `false` |

---

## Database based Key Management

When `KM_TYPE=db` (default), keys are stored unencrypted in the database. This mode is ideal for development or testing.

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
configure the following:

```env
KM_TYPE=vault
VAULT_URL=http://localhost:8200/v1/transit
VAULT_TOKEN=your-vault-token
```

For each tenant, a new secret engine is created in Vault with the path
`{tenantId}`.

To issue credentials, you need to have a signed certificate for the public key
that is bound to your domain.

In this mode:

- All **signing operations** are delegated to Vault via its API.
- The **private key never leaves** the Vault server.
- Access can be tightly controlled using Vault’s policies and authentication
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

- Implement the key service interface.
- Extend the module factory to support a new `KM_TYPE`.

```ts
// Example (in code):
KM_TYPE = awskms;
```

If you need help integrating a new provider, feel free to open an issue or
contact the maintainers.

---

## Certificates

EUDIPLO supports the use of X.509 certificates for key management. Certificates can be used to verify the authenticity of public keys and establish trust between parties.

### Certificate Generation

When a new key pair is generated, a self-signed certificate is also created. This certificate includes the public key and is stored alongside the key files. The certificate can be overwritten any time via the api.

When using the [Registrar](../getting-started/registrar.md), it will generate a certificate for the public key that can be used to secure the OID4VCI and OID4VP requests. Each tenant will only have one access certificate.

> Note: In the future the access certificate generation will follow the official standard that is under development right now.

### Certificate Format

Certificates are stored in PEM format and can be included in key import requests.

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

**List All Keys**:

```bash
GET /key
Authorization: Bearer <tenant-token>
```

### Supported Key Formats

- **Algorithm Support**: ES256 (ECDSA P-256)
- **Key Format**: JSON Web Key (JWK) format
- **Certificate Support**: Optional X.509 certificates in PEM format
- **Key Generation**: Automatic generation if no keys exist
