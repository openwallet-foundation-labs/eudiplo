# Registrar

To interact with an EUDI Wallet, two types of certificates are required:

- **Access Certificate**: Used to access the EUDI Wallet.
- **Registration Certificate**: Used to request data from the EUDI Wallet.

## Access to the Registrar

When EUDIPLO should interact with the registrar, it needs to be configured with
the required variables that you can find in the
[configuration guide](configuration.md#registrar-settings).

On startup, EUDIPLO will check if there is already a relying party registered
based on the `config/registrar.json` file. If no id is provided, a new Relying
Party will be registered with the registrar using the `REGISTRAR_RP_NAME`.

## Access Certificate

The service will look on startup of there is a valid access certificate with the
`accessCertificateId` in the `config/registrar.json` file. If no valid access
certificate is found, it will request a new one from the registrar and bind it
to the `CREDENTIAL_ISSUER` URL. The access certificate id will be stored in the
`config/registrar.json` file.

## Registration Certificate

The registration certificate is used to request data from the EUDI Wallet. Each
configuration in the `config/presentation` folder allows to configure the
payload of the registration certificate. Since the registration certificates are
bound to a specific type of presentation, they will be managed in in the
presentation config files and not in the `config/registrar.json` file. When no
id is provided in the presentation config file, a new registration certificate
will be requested when a new presentation request is made.
