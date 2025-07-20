# Management

## Authentication

EUDIPLO uses **Bearer JWT token authentication** for all management API
endpoints. The service supports two client management approaches.

Internally, EUDIPLO is using the `sub` claim of the JWT to identify the tenant.

## Self-Managed Clients (Default)

This approach is recommended when you just want to manage one instance.

**EUDIPLO manages OAuth2 clients and issues JWT tokens:**

```bash
# Get JWT token from EUDIPLO
curl -X 'POST' \
  'http://localhost:3000/auth/oauth2/token' \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "your-tenant-id",
    "client_secret": "your-client-secret"
  }'

# Use token with API endpoints
curl -X 'POST' \
  'http://localhost:3000/issuer-management/offer' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
  "response_type": "qrcode",
  "credentialConfigurationIds": ["pid"]
}'
```

### Client Configuration

Configure clients in your environment or through service configuration:

```env
AUTH_CLIENT_ID=tenant-1
AUTH_CLIENT_SECRET=secure-random-secret

# JWT configuration (self-managed mode)
JWT_SECRET=your-256-bit-secret
JWT_ISSUER=https://your-domain.com
JWT_EXPIRES_IN=1h
```

!!! danger "Important"

    Don't forget to set a strong `JWT_SECRET` for signing your JWT tokens!!!

## External OIDC Provider

**External IAM (e.g., Keycloak) manages clients and tokens:**

TODO: needs to be aligned

When using an external OIDC provider like Keycloak, you need to configure the
EUDIPLO service to use the OIDC issuer URL via the `OIDC` environment variable.

This will deactivate the internal client management and use the external OIDC
provider for authentication.

## API Endpoint Patterns

> **Important**: the `{tenantId}` in the URL must match the tenant associated
> with your JWT token via the `sub` field.

### Tenant Initialization Process

TODO: needs to be aligned

- when to create all the necessary resources like keys and certificates
- when to remove them
- when to check if they are still valid

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
