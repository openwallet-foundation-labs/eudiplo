| Key | Type | Notes |
| --- | ---- | ----- |
| `ENCRYPTION_KEY_SOURCE` | `string` | Source for encryption key: env (dev), vault/aws/azure (prod - key only in RAM)  (default: `env`) |
| `VAULT_ENCRYPTION_KEY_PATH` | `string` | Path to encryption key in Vault KV secrets engine [when ENCRYPTION_KEY_SOURCE is {"override":true} \| "vault" → then default="secret/data/eudiplo/encryption-key"] |
| `AWS_ENCRYPTION_SECRET_NAME` | `string` | Name of the encryption key secret in AWS Secrets Manager [when ENCRYPTION_KEY_SOURCE is {"override":true} \| "aws" → then required] |
| `AWS_ENCRYPTION_SECRET_KEY` | `string` | JSON key within the AWS secret (if secret is JSON) [when ENCRYPTION_KEY_SOURCE is {"override":true} \| "aws" → then default="key"] |
| `AZURE_KEYVAULT_URL` | `string` | Azure Key Vault URL (e.g., https://myvault.vault.azure.net) [when ENCRYPTION_KEY_SOURCE is {"override":true} \| "azure" → then required] |
| `AZURE_ENCRYPTION_SECRET_NAME` | `string` | Name of the encryption key secret in Azure Key Vault [when ENCRYPTION_KEY_SOURCE is {"override":true} \| "azure" → then required] |
