# API Authentication

EUDIPLO uses OAuth 2.0 Client Credentials flow for API authentication, designed
for service-to-service communication without user interaction.

## Configuration

--8<-- "docs/generated/config-auth.md"

## Authentication Architecture

### Design Principles

- **Service-to-Service**: No user interaction required
- **Tenant Isolation**: JWTs are used to isolate tenant data
- **Pluggable Identity**: Support for both built-in and external OIDC providers
- **Stateless**: JWT tokens enable horizontal scaling

### Security Model

- All management endpoints require authentication
- Tenant data is isolated using JWT subject claims
- Tokens are signed and validated for integrity
- Support for token expiration and rotation
- Endpoints are role based protected

**Related Architecture:** For multi-tenant configuration and session management,
see [Tenant-Based Architecture](../architecture/tenant.md) and
[Sessions](../architecture/sessions.md).

### Import

Clients can be imported via configuration files. See [Configuration Import](../architecture/configuration-import.md#client-configurations)
for details.

---

## OAuth2 Client Credentials Authentication

This API exclusively uses the OAuth2 client credentials flow, which is designed
for service-to-service authentication where no user interaction is required.

### Built-in OAuth2 Server (Recommended for Getting Started)

EUDIPLO includes a built-in OAuth2 server for simple deployments:

1. **Swagger UI Authentication:**
    - Navigate to the Swagger UI at `/api`
    - Click the "Authorize" button
    - Select "oauth2"
    - Enter client ID and secret (configured via environment variables)
    - Click "Authorize"

2. **Programmatic Access:**

    **Option 1: Credentials in Authorization Header (OAuth2 Standard):**

    ```bash
    curl -X POST http://localhost:3000/oauth2/token \
      -H "Content-Type: application/json" \
      -H "Authorization: Basic $(echo -n 'client_id:client_secret' | base64)" \
      -d '{
        "grant_type": "client_credentials"
      }'
    ```

    **Option 2: Credentials in Request Body:**

    ```bash
    curl -X POST http://localhost:3000/oauth2/token \
      -H "Content-Type: application/json" \
      -d '{
        "grant_type": "client_credentials",
        "client_id": "your-client-id",
        "client_secret": "your-client-secret"
      }'
    ```

### External OIDC Provider

For enterprise deployments with existing identity infrastructure, EUDIPLO can
integrate with external OIDC providers like Keycloak, Auth0, or Azure AD.

**Configuration:**

```env
OIDC=https://your-keycloak.example.com/realms/your-realm
PUBLIC_URL=https://your-api.example.com
```

**Authentication Flow:**

1. Use your OIDC provider's token endpoint with client credentials flow
2. Include the access token in API requests: `Authorization: Bearer <token>`

## Configuration

### External OIDC Provider

```bash
# Enable external OIDC
OIDC=true
OIDC_INTERNAL_ISSUER_URL=https://your-keycloak.example.com/realms/your-realm
PUBLIC_URL=https://your-api.example.com
```

### Integrated OAuth2 Server

```bash
# Leave OIDC undefined for integrated OAuth2 server
PUBLIC_URL=https://your-api.example.com
JWT_SECRET=your-secret-key-here-minimum-32-characters
AUTH_CLIENT_ID=root
AUTH_CLIENT_SECRET=root
```

**Configuration Reference:** For complete configuration options and environment
variables, see [Key Management](../architecture/key-management.md) and
[Database Configuration](../architecture/database.md).

## Protected Endpoints

All administrative endpoints require OAuth2 authentication and are protected by a role based access control approach.

The following roles are available:

```typescript
--8<-- "apps/backend/src/auth/roles/role.enum.ts"
```

Each client can have multiple roles assigned, but each client can only be assigned to one tenant at maximum. The client with the tenant manage must not be assigned to any tenant since it is managing the service in general. There could be other roles in the future like limited access to the metrics endpoint.

### Resource-Level Access Control

In addition to role-based access control, clients can be restricted to specific presentation or issuance configurations. This allows for fine-grained control over which configurations a service account can use.

**Configuration Fields:**

- `allowedPresentationConfigs`: Array of presentation config IDs. If empty or null, the client can use any presentation config.
- `allowedIssuanceConfigs`: Array of issuance config IDs. If empty or null, the client can use any issuance config.

Example: Creating a Restricted Client

```bash
curl -X POST http://localhost:3000/clients \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "partner-service",
    "roles": ["presentation:offer", "issuance:offer"],
    "allowedPresentationConfigs": ["age-verification", "identity-check"],
    "allowedIssuanceConfigs": ["partner-credential"]
  }'
```

This client can only:

- Create presentation offers for `age-verification` and `identity-check` configs
- Create issuance offers for `partner-credential` config

If the client attempts to use a config not in their allowed list, a `403 Forbidden` error is returned.

**Use Cases:**

- **Partner Integrations**: Limit external partners to specific credential types
- **Department Isolation**: Different departments use different credential configurations
- **Compliance**: Ensure services only access configurations they are authorized to use

**Note:** These restrictions work with both the built-in OAuth2 server and external OIDC providers (e.g., Keycloak). When using an external OIDC provider, the restrictions are stored in EUDIPLO's database and applied during request validation.

## Troubleshooting

### Token Validation Errors

1. Verify that tokens include the correct audience (`eudiplo-service`)
2. Ensure clock synchronization between client and server
3. Check token expiration times

### Integrated OAuth2 Server Issues

1. Verify `JWT_SECRET` is at least 32 characters
2. Ensure client credentials (`AUTH_CLIENT_ID`/`AUTH_CLIENT_SECRET`) are
   configured correctly
3. Check that `PUBLIC_URL` is accessible for OAuth2 flows

## Security Considerations

- **Token Lifetime**: Tokens expire after 24 hours for client credentials flow. It can be updated by setting the `JWT_EXPIRES_IN` to another value, default value is `24h`.
- **Secure Storage**: Store client credentials and tokens securely and never
  expose them in logs or URLs
- **Service-to-Service**: This API is designed for service-to-service
  authentication without user interaction
