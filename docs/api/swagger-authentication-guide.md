# Swagger UI Authentication Guide

This guide shows how to use the enhanced Swagger UI with authentication for
the EUDIPLO Service API.

## Authentication Pattern

EUDIPLO uses **OAuth2 Client Credentials flow with Bearer JWT tokens** for all API access:

1. **Get JWT Token**: Call `/auth/token` with client credentials
2. **Use Token**: Include `Authorization: Bearer <token>` in API requests
3. **Access APIs**: Use tenant-specific endpoints

## Multi-Tenancy Support

EUDIPLO can serve multiple tenants with isolated endpoints:

- **Single tenant usage**: Use one tenant with endpoints like `/{tenantId}/vci/credential`
- **Multi-tenant usage**: Serve multiple tenants, each with their own `/{tenantId}/...` endpoints
- **Client Management**: Choose between self-managed clients or external OIDC providers

### Client Management Options

**Self-Managed Clients (Default)**:
- EUDIPLO manages OAuth2 clients internally
- Use EUDIPLO's `/auth/token` endpoint to get JWT tokens
- Configure via environment variables

**External OIDC Provider (`OIDC=true`)**:
- External IAM (e.g., Keycloak) manages clients
- Get JWT tokens directly from your OIDC provider
- Use standard OAuth2 Client Credentials flow with your IAM system

## Authentication Steps

### 1. **Get an Access Token**

**For Self-Managed Clients:**
Call EUDIPLO's `/auth/token` endpoint:

1. Navigate to `/api` in your browser (Swagger UI)
2. Find the **Authentication** section
3. Click on `POST /auth/token`
4. Click **"Try it out"**
5. Enter your client credentials:

```json
{
    "client_id": "your-tenant-id",
    "client_secret": "your-client-secret"
}
```

6. Click **"Execute"**
7. Copy the `access_token` from the response

**For External OIDC Providers:**
Get your JWT token directly from your OIDC provider using standard OAuth2 Client Credentials flow. For example:

```bash
curl -X POST https://your-keycloak.com/realms/your-realm/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=your-client&client_secret=your-secret"
```

### 2. **Authorize in Swagger UI**

1. Click the **🔒 Authorize** button at the top of the Swagger UI
2. In the "bearer (http, Bearer)" dialog:
    - Enter: `Bearer YOUR_ACCESS_TOKEN`
    - Example: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. Click **"Authorize"**
4. Click **"Close"**

### 3. **Use Protected Endpoints**

All API endpoints follow the pattern `/{tenantId}/...` and require your JWT token:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Example API calls:**
- `/{tenantId}/vci/credential` - Credential issuance
- `/{tenantId}/oid4vp/request` - Presentation requests  
- `/{tenantId}/.well-known/openid-credential-issuer` - Metadata

The `{tenantId}` must match the tenant associated with your client credentials.

## Configuration Examples

### Self-Managed Clients

**Environment Configuration:**
```env
# Single-tenant with self-managed client
PUBLIC_URL=https://example.com
AUTH_CLIENT_ID=my-tenant
AUTH_CLIENT_SECRET=secure-secret
JWT_SECRET=your-jwt-secret
JWT_ISSUER=https://example.com
JWT_EXPIRES_IN=1h

# Multi-tenant with self-managed clients  
OIDC=false  # Use internal client management
```

### External OIDC Provider

**Environment Configuration:**
```env
# Enable external OIDC provider
OIDC=true
OIDC_ISSUER=https://keycloak.example.com/realms/eudiplo
# Client credentials are managed in Keycloak
```

**Keycloak Client Configuration:**
```json
{
  "clientId": "eudiplo-tenant-1",
  "secret": "keycloak-managed-secret",
  "serviceAccountsEnabled": true,
  "authorizationServicesEnabled": false
}
```

## Features

### ✅ **Persistent Authorization**

- Your token stays active even after page refresh
- No need to re-enter credentials every time

### ✅ **Visual Indicators**

- 🔒 icon shows which endpoints require authentication
- Clear error messages for authentication failures

### ✅ **Multi-Tenant Support**

- Tenant-scoped endpoints clearly marked with `{tenantId}` parameter
- Automatic token validation for tenant access

## Troubleshooting

### Common Issues

**Invalid Client Credentials**
```json
{
  "error": "invalid_client",
  "error_description": "Client authentication failed"
}
```
- Check your `client_id` and `client_secret`
- Ensure your client is configured in the system

**Unauthorized Access**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
- Verify your JWT token is valid and not expired
- Check token was obtained from correct source (EUDIPLO vs OIDC provider)

**Tenant Mismatch**
```json
{
  "statusCode": 403,
  "message": "Access denied for this tenant"
}
```
- Ensure the `{tenantId}` in the URL matches your `client_id`
- Verify your token hasn't expired

### Getting Help

1. **Check Configuration**: Verify your `.env` file settings
2. **Test Authentication**: Use the appropriate endpoint to verify credentials
   - Self-managed: `/auth/token` endpoint
   - External OIDC: Your OIDC provider's token endpoint
3. **Check Logs**: Review container logs for detailed error messages

## Example Requests

### Self-Managed Clients

**Get Token:**
```bash
curl -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "tenant-123",
    "client_secret": "secret-456"
  }'
```

**Use Protected Endpoint:**
```bash
curl -X POST http://localhost:3000/tenant-123/vci/offer \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "response_type": "qrcode",
    "credentialConfigurationIds": ["pid"]
  }'
```

### External OIDC Clients

**Get Token from OIDC Provider:**
```bash
curl -X POST https://keycloak.example.com/realms/eudiplo/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=eudiplo-client&client_secret=secret"
```

**Use Protected Endpoint:**
```bash
curl -X POST http://localhost:3000/tenant-123/vci/offer \
  -H "Authorization: Bearer YOUR_OIDC_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "response_type": "qrcode",
    "credentialConfigurationIds": ["pid"]
  }'
```
