# Databases

This service uses [TypeORM](https://typeorm.io/) for data persistence. By
default, a local **SQLite** database is used, but the system also supports
**PostgreSQL** and can be extended to work with other engines such as **MySQL**
thanks to TypeORM’s flexible architecture.

## Configuration

--8<-- "docs/generated/config-database.md"

---

## SQLite (Default)

When using `DB_TYPE=sqlite`, the service will store its data in a local
file-based SQLite database located at the path defined by the `FOLDER` variable
(`./config` by default). This setup is lightweight and ideal for:

- Development
- Testing
- Prototyping

No additional database server is required.

---

## PostgreSQL

To connect to a PostgreSQL instance, set the following environment variables:

```env
DB_TYPE=postgres
DB_HOST=your-hostname
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_DATABASE=your-database
```

This mode is suitable for:

- Production deployments
- Multi-instance setups
- Scenarios requiring scalability and better concurrency handling

Make sure your database is reachable and properly initialized before starting
the service.

---

## Encryption at Rest

EUDIPLO encrypts sensitive data at rest using **AES-256-GCM** authenticated encryption. This protects cryptographic keys and personal information stored in the database from unauthorized access, even if the database itself is compromised.

### Encrypted Fields

The following data is automatically encrypted before being written to the database:

| Entity                   | Field                  | Data Type                          |
| ------------------------ | ---------------------- | ---------------------------------- |
| `KeyEntity`              | `key`                  | Private JWK material               |
| `Session`                | `credentials`          | Verified presentation claims (PII) |
| `Session`                | `credentialPayload`    | Issuance offer data                |
| `Session`                | `auth_queries`         | Authorization query data           |
| `Session`                | `offer`                | Credential offer object            |
| `InteractiveAuthSession` | `presentationData`     | OpenID4VP presentation data        |
| `InteractiveAuthSession` | `completedStepsData`   | Step completion results            |
| `InteractiveAuthSession` | `authorizationDetails` | Authorization details              |

### Encryption Key Sources

The encryption key can be sourced from different providers, configured via `ENCRYPTION_KEY_SOURCE`:

| Source  | Description                             | Security Level | Use Case                 |
| ------- | --------------------------------------- | -------------- | ------------------------ |
| `env`   | Derived from `MASTER_SECRET` via HKDF   | Development    | Local dev, testing       |
| `vault` | Fetched from HashiCorp Vault at startup | Production     | Self-hosted, on-prem     |
| `aws`   | Fetched from AWS Secrets Manager        | Production     | AWS-native deployments   |
| `azure` | Fetched from Azure Key Vault            | Production     | Azure-native deployments |

!!! tip "Security Hardening"

    When using `vault`, `aws`, or `azure`, the encryption key is **only in RAM** — it's never stored in environment variables. This means a compromised container cannot retrieve the key via `env` or `/proc/*/environ` commands.

#### Environment-based Key (Development)

```bash
ENCRYPTION_KEY_SOURCE=env  # default
MASTER_SECRET=your-jwt-secret  # key derived via HKDF
```

#### HashiCorp Vault

```bash
ENCRYPTION_KEY_SOURCE=vault
VAULT_ADDR=https://vault.example.com:8200
VAULT_TOKEN=hvs.your-token
VAULT_ENCRYPTION_KEY_PATH=secret/data/eudiplo/encryption-key  # optional, defaults shown

# Create the key in Vault:
vault kv put secret/eudiplo/encryption-key key=$(openssl rand -base64 32)
```

#### AWS Secrets Manager

```bash
ENCRYPTION_KEY_SOURCE=aws
AWS_REGION=us-east-1
AWS_ENCRYPTION_SECRET_NAME=eudiplo/encryption-key

# Create the key in AWS:
aws secretsmanager create-secret \
  --name eudiplo/encryption-key \
  --secret-string $(openssl rand -base64 32)
```

Uses IAM roles automatically when running in EKS/ECS (no credentials needed).

#### Azure Key Vault

```bash
ENCRYPTION_KEY_SOURCE=azure
AZURE_KEYVAULT_URL=https://myvault.vault.azure.net
AZURE_ENCRYPTION_SECRET_NAME=eudiplo-encryption-key

# Create the key in Azure:
az keyvault secret set \
  --vault-name myvault \
  --name eudiplo-encryption-key \
  --value $(openssl rand -base64 32)
```

Uses Managed Identity automatically when running in Azure (no credentials needed).

### Key Requirements

The encryption key must be:

- **256 bits** (32 bytes)
- **Encoded as**: Base64 (44 characters) or Hex (64 characters)

Generate a secure key:

```bash
# Base64 (recommended)
openssl rand -base64 32

# Hex
openssl rand -hex 32
```

### Migration from Unencrypted Data

If upgrading from a version without encryption, EUDIPLO automatically handles migration:

1. **Reading**: Unencrypted data is detected and read normally
2. **Writing**: All writes use encryption

To fully encrypt existing data, update each record (e.g., via a migration script or by re-creating keys/sessions).

!!! warning "Important: Key Recovery"

    If you lose your encryption key, all encrypted data becomes unrecoverable. Ensure you:

       - Use a secrets manager with backup/versioning
       - Document the key's location for disaster recovery
       - Test key rotation procedures

!!! tip "Database Column Type Change"

    Encrypted columns use `text` type instead of `json`. If you have custom migrations or database constraints on these columns, update them accordingly.

---

## Extensibility

Because this service uses TypeORM, it is easy to integrate additional database
engines such as:

- MySQL / MariaDB
- Microsoft SQL Server
- Oracle

To add support for a new engine:

- Install the appropriate TypeORM driver (e.g., `mysql2`)
- Set `DB_TYPE` to the corresponding engine name
- Configure the necessary connection options via environment variables

Let us know if you need help extending support for additional databases.

---

## Multi-Tenant Database Schema

EUDIPLO supports multi-tenancy, allowing multiple tenants to share the same
database while keeping their data isolated. This is achieved by adding a
`tenantId` column to relevant entities and filtering all queries by this
identifier.

### Tenant Isolation in Database

In multi-tenant mode, data isolation is achieved through a `tenantId` column in
all relevant entities:

#### Core Entities with Tenant Support

**Session Entity:**

```typescript
@Entity()
export class Session {
    @PrimaryColumn('uuid')
    id: string;

    @Column('varchar')
    tenantId: string; // Tenant ID for multi-tenancy support

    // ... other fields
}
```

**Issuance Configuration Entity:**

```typescript
@Entity()
export class IssuanceConfig {
    @PrimaryColumn('varchar')
    id: string;

    @Column('varchar')
    tenantId: string;

    // ... other fields
}
```

### Database Queries

All database operations automatically filter by `tenantId` when in multi-tenant
mode:

```typescript
// Example: Get sessions for specific tenant
return this.sessionRepository.findBy({ tenantId });

// Example: Update session with tenant scope
return this.sessionRepository.update({ id: sessionId, tenantId }, updateData);
```
