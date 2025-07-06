# Key Management

The keys used for **signing operations** can be managed in two different ways, depending on the selected key management type (`KM_TYPE`).

> 💡 **Encryption operations** are always performed locally using the configured crypto module, regardless of the key management method.

## Local (File-based)

When `KM_TYPE=file` (default), keys are stored unencrypted in the directory defined by the `KM_FOLDER` environment variable (default: `./config/keys`). This setup is intended for development or testing purposes.

On startup, the service will generate a key pair and a self-signed certificate if none are found. These files are stored in the same directory:

- `private-key.pem`
- `public-key.pem`
- `signing-certificate.pem`

You can also provide your own pre-generated keys and certificates by placing them in the folder.

## Vault (HashiCorp Vault)

To use [HashiCorp Vault](https://www.vaultproject.io/) for key management, set the following environment variables:

```env
KM_TYPE=vault
VAULT_URL=https://your-vault-instance
VAULT_TOKEN=your-vault-token
VAULT_KEY_ID=your-key-id
```

In this mode, signing keys are securely stored and managed in Vault. All signing operations are delegated to Vault via its API. Key material never leaves the Vault server, and access can be tightly controlled via Vault's UI, CLI, or policies.

## Extensibility

The key management system is built to be **extensible**. It is easy to integrate alternative key management solutions, such as:

- AWS KMS
- Azure Key Vault
- Google Cloud KMS
- HSMs (Hardware Security Modules)

You can implement your own provider by extending the key service interface and adapting the module’s factory function.

```ts
// Example (in code):
KM_TYPE=awskms
```

Let us know if you need guidance on adding new providers.
