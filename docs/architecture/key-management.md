# Key Management

The keys used for **signing operations** in EUDIPLO can be managed in multiple
ways, depending on the selected key management type (`KM_TYPE`).

> 💡 **Encryption operations** are always handled locally using the configured
> crypto module, regardless of the selected key management backend.

---

## Configuration Overview

| Variable       | Description                                                             | Required for | Default |
| -------------- | ----------------------------------------------------------------------- | ------------ | ------- |
| `KM_TYPE`      | Key management engine type                                              | All          | `file`  |
| `VAULT_URL`    | Vault API URL to the transit engine like `http://vault:8200/v1/transit` | `vault`      | –       |
| `VAULT_TOKEN`  | Authentication token for Vault                                          | `vault`      | –       |
| `VAULT_KEY_ID` | Name or path of the key in Vault                                        | `vault`      | –       |

> ✅ When using the default `file` mode, the keys will be stored in the `keys`
> folder in the config folder. Vault mode requires all `VAULT_*` variables.

---

## Local (File-Based) Key Management

When `KM_TYPE=file` (default), keys are stored unencrypted in the `keys`
directory in the config folder. This mode is ideal for development or testing.

On startup, if no keys are found, the service will generate:

- `private-key.pem`
- `public-key.pem`
- `signing-certificate.pem` (self-signed)

You can also place your own pre-generated PEM files in the folder to override
the defaults.

---

## Vault (HashiCorp Vault)

To use [HashiCorp Vault](https://www.vaultproject.io/) for key management,
configure the following:

```env
KM_TYPE=vault
VAULT_URL=http://localhost:8200/v1/transit
VAULT_TOKEN=your-vault-token
VAULT_KEY_ID=your-key-id
```

The guide assumes that you have a Vault server running with the Transit secrets
engine enabled. If there is no key with the specified `VAULT_KEY_ID`, the
service will create it automatically.

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

## Multi-Tenant Key Management

In multi-tenant mode, EUDIPLO provides **complete key isolation** between
tenants, ensuring cryptographic separation and security.

### Tenant-Specific Key Storage

#### File-Based Key Management

When `KM_TYPE=file` in multi-tenant mode:

```
config/
├── tenant-1/
│   ├── keys/
│   │   ├── signing-key.json
│   │   └── encryption-key.json
│   └── display.json
├── tenant-2/
│   ├── keys/
│   │   ├── signing-key.json
│   │   └── encryption-key.json
│   └── display.json
```

#### Database Key Management

Keys are stored in the `KeyEntity` table with tenant isolation:

```typescript
@Entity()
export class KeyEntity {
    @Column('varchar', { primary: true })
    tenantId: string; // Primary key includes tenant ID

    @Column('json')
    privateKey: JsonWebKey;
}
```

### Automatic Key Generation

**Tenant Initialization Process:**

1. Client registers with credentials (`client_id`, `client_secret`)
2. System creates tenant directory: `/config/{tenantId}/`
3. Cryptographic key pair automatically generated
4. Keys stored in tenant-specific location
5. Generation of certificate for public key

### Key Access Patterns

**Tenant-Scoped Key Retrieval:**

```typescript
// Get signing keys for specific tenant
const keys = await this.cryptoService.getJwks(tenantId);

// Get encryption context for tenant
const context = this.cryptoService.getCallbackContext(tenantId);
```

**Security Benefits:**

- **Complete isolation**: No cross-tenant key access possible
- **Independent rotation**: Each tenant can manage keys separately
- **Audit trail**: All key operations scoped to tenant ID
- **Scalable**: New tenants automatically provisioned with fresh keys
