# Registrar

To interact with an EUDI Wallet, two types of certificates are required:

- **Access Certificate** – Grants access to the EUDI Wallet.
- **Registration Certificate** – Authorizes data requests from the EUDI Wallet.

You can still use EUDIPLO without these certificates, but it can result in
warnings when making requests to the EUDI Wallet.

---

## Prerequisites

!!! warning "Role Required"

    To see the **Registrar** menu in the client, your tenant must have the
    `registrar:manage` role assigned. When creating a tenant, make sure to
    select this role (or select "All roles" for a full setup).

---

## Step 1: Configure Registrar Credentials

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

!!! info "Credential Validation"

    When you save the configuration, EUDIPLO validates your credentials by
    attempting to authenticate with the registrar's OIDC endpoint. If
    authentication fails, you'll receive an error message and the
    configuration will not be saved.

### Via Configuration File

You can also configure the registrar by placing a `registrar.json` file in the
tenant's configuration folder:

```json title="config/{tenant-id}/registrar.json"
{
    "registrarUrl": "https://sandbox.eudi-wallet.org/api",
    "oidcUrl": "https://auth.sandbox.eudi-wallet.org/realms/sandbox-registrar",
    "clientId": "swagger",
    "username": "your-username",
    "password": "your-password",
    "registrationCertificateDefaults": {
        "privacy_policy": "https://verifier.example/privacy",
        "support_uri": "mailto:support@verifier.example"
    }
}
```

!!! note "File Import Behavior"

    When importing from a configuration file during startup, credentials are
    **not** validated (the registrar might not be reachable during initial setup).
    Make sure your credentials are correct before relying on the configuration.

---

## Step 2: Create an Access Certificate

Once the registrar is configured, you can create access certificates via the
Key Creation Wizard.

### Via the Key Creation Wizard

1. Navigate to **Keys** in the sidebar
2. Click **+ Create Key** to open the wizard
3. Select **Access Certificate** as the key usage
4. Select **Registrar Enrollment** as the access source
5. Enter a name for the key chain
6. Click **Create**

The wizard will:

- Create a new key chain
- Generate a signing key
- Request an access certificate from the registrar
- Store the certificate in the key chain

### Via the API

```bash
curl -X POST "https://your-eudiplo-instance/registrar/access-certificate" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"keyChainId": "your-key-chain-id"}'
```

The response includes:

- `id`: The registrar's certificate ID
- `keyChainId`: The local EUDIPLO key chain ID
- `crt`: The certificate content

---

## Registration Certificate

Registration certificates are attached to OID4VP requests when:

- a registrar is configured for the tenant, and
- the selected presentation config contains a `registrationCert` field.

### Resolution Strategies

The `registrationCert` field supports three mutually exclusive strategies, evaluated in priority order:

| Field                   | Behavior                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registrationCert.jwt`  | Uses the provided JWT directly (no registrar call). Still validated for expiry and DCQL authorization.                                                                          |
| `registrationCert.id`   | Looks up an existing (non-revoked) certificate by ID from the registrar. Falls back to creating a new one using `registrationCert.body` if no active cert is found for that ID. |
| `registrationCert.body` | Creates a new certificate at the registrar using the merged body (see below).                                                                                                   |

At least one of `jwt`, `id`, or `body` must be provided.

### Payload Merging

When creating via `body`, the final certificate payload is merged in this order (later takes precedence):

1. `registrationCertificateDefaults` from the tenant's registrar config (shared legal/contact defaults)
2. `registrationCert.body` from the presentation config (per-presentation overrides)

The `rpId` is always derived automatically from the tenant's registrar relying party and cannot be set manually.

**Required fields** (must be present after merging):

| Field            | Where to set                                                     |
| ---------------- | ---------------------------------------------------------------- |
| `privacy_policy` | Registrar defaults or presentation body                          |
| `support_uri`    | Registrar defaults or presentation body                          |
| `purpose`        | Presentation body (`registrationCert.body.purpose`)              |
| `credentials`    | Auto-derived from `dcql_query.credentials` if not explicitly set |

### Credential Auto-Derivation

If `registrationCert.body.credentials` is not explicitly set, EUDIPLO automatically derives the credentials list from the effective DCQL query (`dcql_query.credentials`) of the presentation config. Only the `format`, `claims`, and `meta` fields are forwarded to the registrar (DCQL-only fields like `id`, `multiple`, and `trusted_authorities` are stripped).

### Certificate Validation

Every registration certificate (regardless of source) is validated before use:

- **Temporal validity**: `exp` and `nbf` are checked with a 60-second clock-skew tolerance. Expired or not-yet-valid certificates are rejected.
- **DCQL authorization (overasking prevention)**: Every credential requested in the DCQL query must be present in the certificate's authorized `credentials` claim. If the certificate does not cover all requested credentials, the request is rejected to prevent overasking.

### Recommended Setup

```json title="config/{tenant-id}/registrar.json — shared defaults"
{
    "registrationCertificateDefaults": {
        "privacy_policy": "https://verifier.example/privacy",
        "support_uri": "mailto:support@verifier.example"
    }
}
```

```json title="Presentation config — per-presentation fields"
{
    "registrationCert": {
        "body": {
            "purpose": [{ "lang": "en", "value": "Age verification" }]
        }
    }
}
```
