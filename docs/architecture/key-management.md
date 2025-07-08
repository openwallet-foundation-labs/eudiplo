# Key Management

The keys used for **signing operations** in EUDIPLO can be managed in multiple
ways, depending on the selected key management type (`KM_TYPE`).

> 💡 **Encryption operations** are always handled locally using the configured
> crypto module, regardless of the selected key management backend.

---

## Configuration Overview

| Variable       | Description                      | Required for | Default         |
| -------------- | -------------------------------- | ------------ | --------------- |
| `KM_TYPE`      | Key management engine type       | All          | `file`          |
| `KM_FOLDER`    | Path to store/read keys locally  | `file`       | `./config/keys` |
| `VAULT_URL`    | Vault API URL                    | `vault`      | –               |
| `VAULT_TOKEN`  | Authentication token for Vault   | `vault`      | –               |
| `VAULT_KEY_ID` | Name or path of the key in Vault | `vault`      | –               |

> ✅ When using the default `file` mode, only `KM_FOLDER` is needed. Vault mode
> requires all `VAULT_*` variables.

---

## Local (File-Based) Key Management

When `KM_TYPE=file` (default), keys are stored unencrypted in the directory
specified by the `KM_FOLDER` variable (`./config/keys` by default). This mode is
ideal for development or testing.

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
VAULT_URL=https://your-vault-instance
VAULT_TOKEN=your-vault-token
VAULT_KEY_ID=your-key-id
```

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
