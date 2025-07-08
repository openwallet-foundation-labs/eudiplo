# Configuration

Configuration is done via environment variables. You can use the provided `.env`
file as a template.

---

## Minimal Required Configuration

The following variables are required for EUDIPLO to start:

```env
PROXY=https://service.eudi-wallet.dev
```

---

## General Settings

| Variable            | Description                                                            | Default                             |
| ------------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| `PORT`              | Port where the service will run                                        | `3000`                              |
| `PROXY`             | External URL of the service (e.g., when behind reverse proxy or ngrok) | –                                   |
| `CREDENTIAL_ISSUER` | Public-facing URL for credential issuance (fallbacks to `${PROXY}`)    | `${PROXY}`                          |
| `AUTH_SERVER`       | Authorization server URL (fallbacks to `${PROXY}`)                     | `${PROXY}`                          |
| `TOKEN_ENDPOINT`    | Token endpoint URL for OIDC/OAuth                                      | `${CREDENTIAL_ISSUER}/oauth2/token` |
| `FOLDER`            | Path to the configuration folder                                       | `./assets`                          |
| `PUBLIC_FOLDER`     | Path to the public folder for static files                             | `../assets/public`                  |
| `KM_FOLDER`         | Folder path for key storage when using file-based key management       | `./config/keys`                     |

---

## Registrar Settings

These values are used to request access and registration certificates from the
Registrar.

| Variable            | Description                       |
| ------------------- | --------------------------------- |
| `REGISTRAR_URL`     | URL of the registrar              |
| `REGISTRAR_RP_NAME` | Display name of the Relying Party |

Used to authenticate against the Registrar.

| Variable                      | Description                                |
| ----------------------------- | ------------------------------------------ |
| `KEYCLOAK_REALM`              | Keycloak realm name                        |
| `KEYCLOAK_AUTH_SERVER_URL`    | URL to the Keycloak authentication server  |
| `KEYCLOAK_RESOURCE`           | Client ID as configured in Keycloak        |
| `KEYCLOAK_CREDENTIALS_SECRET` | Secret associated with the Keycloak client |

---

## Database Settings

| Variable      | Description                              | Default  |
| ------------- | ---------------------------------------- | -------- |
| `DB_TYPE`     | Database engine (`sqlite` or `postgres`) | `sqlite` |
| `DB_HOST`     | Hostname for PostgreSQL                  | –        |
| `DB_PORT`     | Port for PostgreSQL                      | –        |
| `DB_USERNAME` | PostgreSQL username                      | –        |
| `DB_PASSWORD` | PostgreSQL password                      | –        |
| `DB_DATABASE` | PostgreSQL database name                 | –        |

> When using SQLite, only `FOLDER` is required. For PostgreSQL, all listed DB
> variables must be provided.
