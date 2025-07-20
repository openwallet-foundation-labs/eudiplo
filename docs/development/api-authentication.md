# API Authentication

The EUDIP1. **Swagger UI Authentication:**

- Navigate to the Swagger UI at `/api`
- Click the "Authorize" button
- Select "oauth2"
- Enter client ID and secret (default: `root`/`root`)
- The Swagger UI will automatically send credentials in the Authorization header
  (Basic auth)rvice API uses OAuth2 client credentials flow for all
  authentication, providing a unified approach that works with both integrated
  OAuth2 server and external OIDC providers.

## OAuth2 Client Credentials Authentication

This API exclusively uses the OAuth2 client credentials flow, which is designed
for service-to-service authentication where no user interaction is required.

### External OIDC Provider (e.g., Keycloak)

When configured with an external OIDC provider:

1. **Swagger UI Authentication:**
    - Navigate to the Swagger UI at `/api`
    - Click the "Authorize" button
    - Select "oauth2"
    - Enter your client ID and client secret
    - Click "Authorize"
    - The Swagger UI will automatically send credentials in the Authorization
      header (Basic auth)

2. **Programmatic Access:**
    - Use your OIDC provider's token endpoint with client credentials flow
    - Include the access token in API requests: `Authorization: Bearer <token>`

### Integrated OAuth2 Server

When using the built-in OAuth2 server:

1. **Swagger UI Authentication:**
    - Navigate to the Swagger UI at `/api`
    - Click the "Authorize" button
    - Select "oauth2"
    - Enter client ID and secret (default: `root`/`root`)

2. **Programmatic Access (Client Credentials Flow):**

    **Option 1: Credentials in Authorization Header (Recommended for OAuth2
    compliance):**

    ```bash
    curl -X POST http://localhost:3000/auth/oauth2/token \
      -H "Content-Type: application/json" \
      -H "Authorization: Basic $(echo -n 'root:root' | base64)" \
      -d '{
        "grant_type": "client_credentials"
      }'
    ```

    **Option 2: Credentials in Request Body:**

    ```bash
    curl -X POST http://localhost:3000/auth/oauth2/token \
      -H "Content-Type: application/json" \
      -d '{
        "grant_type": "client_credentials",
        "client_id": "root",
        "client_secret": "root"
      }'
    ```

## Configuration

### External OIDC Provider

```bash
# Enable external OIDC
OIDC=true
KEYCLOAK_INTERNAL_ISSUER_URL=https://your-keycloak.example.com/realms/your-realm
KEYCLOAK_CLIENT_ID=your-client-id
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

## Protected Endpoints

All administrative endpoints require OAuth2 authentication:

- **Issuer Management** (`/issuer-management/*`) - Credential issuance
  management
- **Presentation Management** (`/presentation-management/*`) - Presentation
  verification management
- **Session Management** (`/session/*`) - Session lifecycle management

## Migration from Bearer Tokens

If you were previously using the `/auth/token` endpoint for JWT tokens, no
changes are required - this endpoint now internally uses the OAuth2 client
credentials flow for backward compatibility.

## Troubleshooting

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

- **Token Lifetime**: Tokens expire after 24 hours for client credentials flow
- **Secure Storage**: Store client credentials and tokens securely and never
  expose them in logs or URLs
- **Service-to-Service**: This API is designed for service-to-service
  authentication without user interaction
