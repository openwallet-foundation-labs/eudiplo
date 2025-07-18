# Registrar

To interact with an EUDI Wallet, two types of certificates are required:

- **Access Certificate** – Grants access to the EUDI Wallet.
- **Registration Certificate** – Authorizes data requests from the EUDI Wallet.

You can still use EUDIPLO without these certificates, but it can end up into
warnings when making requests to the EUDI Wallet.

## Registrar Settings

These values are used to request access and registration certificates from the
Registrar.

| Variable        | Description          |
| --------------- | -------------------- |
| `REGISTRAR_URL` | URL of the registrar |

Used to authenticate against the Registrar.

| Variable                      | Description                                |
| ----------------------------- | ------------------------------------------ |
| `KEYCLOAK_REALM`              | Keycloak realm name                        |
| `KEYCLOAK_AUTH_SERVER_URL`    | URL to the Keycloak authentication server  |
| `KEYCLOAK_RESOURCE`           | Client ID as configured in Keycloak        |
| `KEYCLOAK_CREDENTIALS_SECRET` | Secret associated with the Keycloak client |

## Accessing the Registrar

To enable EUDIPLO to communicate with the registrar, you must configure the
necessary environment variables.

On startup, EUDIPLO checks whether a Relying Party (RP) is already registered
using the `config/registrar.json` file. If no ID is specified, EUDIPLO will
automatically register a new Relying Party with the registrar using the
`RP_NAME` value.

## Access Certificate

At startup, EUDIPLO checks for a valid access certificate based on the
`accessCertificateId` in `config/registrar.json`. If no valid certificate is
found, a new one will be requested from the registrar and bound to the
`CREDENTIAL_ISSUER` URL. The resulting certificate ID will then be stored in
`config/registrar.json`.

## Registration Certificate

The registration certificate is required to request data from the EUDI Wallet.
Each configuration file in the `config/presentation` folder defines the payload
for the corresponding registration certificate.

Since registration certificates are tied to specific presentation types, they
are managed within the individual presentation configuration files—not in
`config/registrar.json`. If no certificate ID is specified in a presentation
config, a new registration certificate will be requested automatically when a
presentation request is made.
