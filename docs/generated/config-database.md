| Key | Type | Notes |
| --- | ---- | ----- |
| `DB_TYPE` | `string` | Database type  (default: `sqlite`) |
| `DB_HOST` | `string` | Database host [when DB_TYPE is {"override":true} \| "sqlite" → otherwise required] |
| `DB_PORT` | `number` | Database port [when DB_TYPE is {"override":true} \| "sqlite" → otherwise required] |
| `DB_USERNAME` | `string` | Database username [when DB_TYPE is {"override":true} \| "sqlite" → otherwise required] |
| `DB_PASSWORD` | `string` | Database password [when DB_TYPE is {"override":true} \| "sqlite" → otherwise required] |
| `DB_DATABASE` | `string` | Database name [when DB_TYPE is {"override":true} \| "sqlite" → otherwise required] |
| `DB_SYNCHRONIZE` | `boolean` | Enable TypeORM schema synchronization. Set to false in production after initial setup and rely on migrations instead.  (default: `true`) |
| `DB_MIGRATIONS_RUN` | `boolean` | Run pending database migrations automatically on startup  (default: `true`) |
