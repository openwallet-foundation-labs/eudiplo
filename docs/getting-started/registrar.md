# Registrar

To interact with an EUDI Wallet, two types of certificates are required:

- **Access Certificate** – Grants access to the EUDI Wallet.
- **Registration Certificate** – Authorizes data requests from the EUDI Wallet.

You can still use EUDIPLO without these certificates, but it can result in
warnings when making requests to the EUDI Wallet.

## Per-Tenant Configuration

Each tenant can configure their own registrar connection with OIDC credentials.
This allows different tenants to connect to different registrar instances or
use different credentials for the same registrar.

### Via the Web UI

1. Navigate to **Registrar** in the sidebar
2. Select a preset (e.g., "German Sandbox") or manually enter the registrar details:
    - **Registrar URL**: The base URL of the registrar API
    - **OIDC URL**: The OpenID Connect realm URL for authentication
    - **Client ID**: The OIDC client ID
    - **Client Secret**: Optional OIDC client secret
    - **Username**: Your registrar account username
    - **Password**: Your registrar account password
3. Click **Save Configuration**

The credentials will be validated before saving. If authentication fails, you'll
receive an error message.

### Via Configuration File

You can also configure the registrar by placing a `registrar.json` file in the
tenant's configuration folder:

```json title="config/{tenant-id}/registrar.json"
{
    "registrarUrl": "https://sandbox.eudi-wallet.org/api",
    "oidcUrl": "https://auth.sandbox.eudi-wallet.org/realms/sandbox-registrar",
    "clientId": "swagger",
    "username": "your-username",
    "password": "your-password"
}
```

## Access Certificate

Once the registrar is configured, you can create access certificates for your keys:

### Via the Web UI

1. Navigate to **Registrar** in the sidebar
2. In the "Create Access Certificate" section, select a key from the dropdown
3. Click **Create Certificate**

The certificate will be automatically stored in EUDIPLO and you'll be redirected
to the certificate detail page.

### Via the API

```bash
curl -X POST "https://your-eudiplo-instance/registrar/access-certificate" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"keyId": "your-key-id"}'
```

The response includes:

- `id`: The registrar's certificate ID
- `certId`: The local EUDIPLO certificate ID
- `crt`: The certificate content

## Registration Certificate

!!! note "Coming Soon"

    Registration Certificate creation through EUDIPLO is not yet implemented. Currently, registration certificates must be managed directly through the registrar's interface.
