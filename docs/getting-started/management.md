# Management

## Authentication

EUDIPLO uses **Bearer JWT token authentication** for all managementAPI
endpoints. The service supports two client management approaches.

Internally, EUDIPLO is using the `sub` claim of the JWT to identify the tenant.

### Self-Managed Clients (Default)

This approach is recommended when you just want to manage one instance.

**EUDIPLO manages OAuth2 clients and issues JWT tokens:**

```bash
# Get JWT token from EUDIPLO
curl -X 'POST' \
  'http://localhost:3000/auth/token' \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "your-tenant-id",
    "client_secret": "your-client-secret"
  }'

# Use token with API endpoints
curl -X 'POST' \
  'http://localhost:3000/vci/offer' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
  "response_type": "qrcode",
  "credentialConfigurationIds": ["pid"]
}'
```

### External OIDC Provider

**External IAM (e.g., Keycloak) manages clients and tokens:**

TODO: needs to be aligned

When `OIDC=true`, tokens can be obtained from either:

1. **EUDIPLO's `/auth/token` endpoint** (proxies to OIDC provider)
2. **Directly from OIDC provider** using standard OAuth2 Client Credentials flow

```bash
curl -X 'POST' \
  'https://keycloak.example.com/realms/eudiplo/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=client_credentials&client_id=eudiplo-client&client_secret=secret'
```

### API Endpoint Patterns

> **Important**: In multi-tenant mode, the `{tenantId}` in the URL must match
> the tenant associated with your JWT token.

## Client Management

### Self-Managed Client Configuration

Configure clients in your environment or through service configuration:

```env
# Default client for single-tenant or multi-tenant
AUTH_CLIENT_ID=tenant-1
AUTH_CLIENT_SECRET=secure-random-secret

# JWT configuration (self-managed mode)
JWT_SECRET=your-256-bit-secret
JWT_ISSUER=https://your-domain.com
JWT_EXPIRES_IN=1h
```

### External OIDC Client Configuration

TODO: needs to be aligned

**EUDIPLO Configuration:**

```env
OIDC=true
OIDC_ISSUER=https://keycloak.example.com/realms/eudiplo
```

**Keycloak Client Example:**

```json
{
    "clientId": "eudiplo-tenant-1",
    "name": "EUDIPLO Tenant 1",
    "serviceAccountsEnabled": true,
    "standardFlowEnabled": false,
    "directAccessGrantsEnabled": false,
    "attributes": {
        "eudiplo.tenant.id": "tenant-1"
    }
}
```

#### Tenant Initialization Process

TODO: needs to be aligned

## Sessions Management

EUDIPLO manages sessions for credential issuance and verification and are bound
to each tenant. In case for a presentation during issuance, both actions are
handled in the same session. Sessions are stored in the database and can be
managed via the `/sessions` endpoint. You can retrieve a specific session via
`/sessions/{id}`.

To tidy up old sessions, an interval is set to delete older session. The default
values can be configured by setting:

- `SESSION_TIDY_UP_INTERVAL`: value in seconds, default: 3600 (1 hour)
- `SESSION_TTL`: value in seconds, default: 86400 (24 hours)

Other elements as persisted status mapping (the binding between a session id and
a status list reference) are not deleted with this process.
