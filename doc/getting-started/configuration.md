# Configuration

Configuration is done via environment variables. You can use the provided `.env` file as a template.

## General Settings

| Variable            | Description                                                                                       | Default                             |
| ------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `PORT`              | Port where the issuer and verifier services will run                                              | `3000`                              |
| `PROXY`             | External URL of the service, required for reverse proxy setups (e.g. [ngrok](https://ngrok.com/)) | –                                   |
| `CREDENTIAL_ISSUER` | Public-facing URL for credential issuance                                                         | `${PROXY}`                          |
| `AUTH_SERVER`       | Authorization server URL                                                                          | `${PROXY}`                          |
| `TOKEN_ENDPOINT`    | Token endpoint URL                                                                                | `${CREDENTIAL_ISSUER}/oauth2/token` |
| `FOLDER`            | Path to the configuration folder                                                                  | `./assets`                          |
| `PUBLIC_FOLDER`     | Path to the public folder for static files                                                        | `../assets/public`                  |
| `KM_FOLDER`         | Path to the key management folder for storing keys                                                | `./config/keys`                     |

## Registrar Settings

These values are used to interact with the Registrar to receive access and registration certificates.

| Variable                      | Description                                            |
| ----------------------------- | ------------------------------------------------------ |
| `REGISTRAR_URL`               | URL of the registrar (e.g., `https://funke-wallet.de`) |
| `REGISTRAR_RP_ID`             | Relying Party ID, printed in console on startup        |
| `REGISTRAR_RENEW`             | Whether to renew the access certificate                |
| `KEYCLOAK_REALM`              | Keycloak realm name                                    |
| `KEYCLOAK_AUTH_SERVER_URL`    | Keycloak server URL                                    |
| `KEYCLOAK_RESOURCE`           | Client ID configured in Keycloak                       |
| `KEYCLOAK_CREDENTIALS_SECRET` | Secret for the client                                  |