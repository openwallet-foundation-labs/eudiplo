| Key | Type | Notes |
| --- | ---- | ----- |
| `DB_TYPE` | `string` | Database type  (default: `sqlite`) |
| `DB_HOST` | `string` | Database host [when DB_TYPE is {"override":true} \| "sqlite" → otherwise required] |
| `DB_PORT` | `number` | Database port [when DB_TYPE is {"override":true} \| "sqlite" → otherwise required] |
| `DB_USERNAME` | `string` | Database username [when DB_TYPE is {"override":true} \| "sqlite" → otherwise required] |
| `DB_PASSWORD` | `string` | Database password [when DB_TYPE is {"override":true} \| "sqlite" → otherwise required] |
| `DB_DATABASE` | `string` | Database name [when DB_TYPE is {"override":true} \| "sqlite" → otherwise required] |
| `DB_SSL` | `boolean` | Enable SSL/TLS for PostgreSQL database connections  (default: `false`) |
| `DB_SSL_REJECT_UNAUTHORIZED` | `boolean` | Reject PostgreSQL TLS certificates that cannot be validated against trusted CAs  (default: `true`) |
| `DB_SSL_CA_PATH` | `string` | Path to CA certificate file used to validate PostgreSQL TLS certificates  [optional] |
| `DB_SSL_CERT_PATH` | `string` | Path to client certificate file for PostgreSQL TLS  [optional] |
| `DB_SSL_KEY_PATH` | `string` | Path to client private key file for PostgreSQL TLS  [optional] |
| `DB_SSL_KEY_PASSPHRASE` | `string` | Passphrase for encrypted DB_SSL_KEY_PATH private key  [optional] |
| `DB_SYNCHRONIZE` | `boolean` | Enable TypeORM schema synchronization. Set to false in production after initial setup and rely on migrations instead.  (default: `true`) |
| `DB_MIGRATIONS_RUN` | `boolean` | Run pending database migrations automatically on startup  (default: `true`) |
