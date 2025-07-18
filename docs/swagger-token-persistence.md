# Swagger Token Persistence Guide

This guide explains how JWT token persistence works in the EUDIPLO Swagger UI
for multi-tenant deployments.

## Token Persistence Features

### ✅ **Automatic Storage**

- Tokens are automatically stored in browser localStorage
- Survives page refreshes and browser restarts
- Secure client-side storage

### ✅ **Session Management**

- Multiple tenant tokens can be stored simultaneously
- Automatic token selection based on current tenant context
- Clear visual indicators of authentication status

### ✅ **Security Features**

- Tokens are stored with expiration timestamps
- Automatic cleanup of expired tokens
- Secure token validation on each request

## How It Works

### Token Storage

When you authenticate via Swagger UI:

1. **Token Retrieval**: Get access token from `/auth/token` endpoint
2. **Automatic Storage**: Token stored in `localStorage` with metadata:
    ```json
    {
        "token": "eyJhbGciOiJIUzI1NiIs...",
        "expires_at": 1642694400,
        "tenant_id": "tenant-123",
        "issued_at": 1642691400
    }
    ```
3. **Persistence**: Token persists across browser sessions

### Token Usage

- **Automatic Headers**: All API requests include
  `Authorization: Bearer <token>`
- **Tenant Scoping**: Token automatically matched to tenant endpoints
- **Validation**: Real-time token validation and expiry checking

### Token Refresh

- **Expiry Detection**: Automatic detection of expired tokens
- **Re-authentication**: Prompts for new authentication when needed
- **Seamless UX**: Minimal interruption to workflow

## Configuration

### Environment Variables

**Multi-Tenant Mode (`OIDC=true`):**

```env
OIDC=true
AUTH_CLIENT_ID=your-default-client-id
AUTH_CLIENT_SECRET=your-default-client-secret
JWT_EXPIRES_IN=1h
```

**Token Expiration:**

- Default: 1 hour (`1h`)
- Configurable via `JWT_EXPIRES_IN`
- Supports: `1h`, `30m`, `2h`, `24h`, etc.

### Client Configuration

**Register Your Client:**

```json
{
    "client_id": "tenant-123",
    "client_secret": "secure-secret-456",
    "tenant_name": "My Organization"
}
```

## Usage Examples

### Basic Authentication Flow

1. **Initial Authentication:**

    ```bash
    # Navigate to /api in browser
    # Click 🔒 Authorize button
    # Enter client credentials
    # Token automatically stored
    ```

2. **Using Stored Token:**

    ```bash
    # All subsequent API calls automatically include:
    # Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
    ```

3. **Multi-Tenant Switching:**
    ```bash
    # Switch between tenants by using different endpoints:
    # /tenant-1/vci/offer
    # /tenant-2/vci/offer
    # Tokens automatically matched to tenant
    ```

### Manual Token Management

**Check Stored Tokens (Browser Console):**

```javascript
// View all stored tokens
localStorage.getItem('eudiplo_tokens');

// Clear all tokens
localStorage.removeItem('eudiplo_tokens');
```

**Token Structure:**

```json
{
    "tenant-123": {
        "token": "eyJhbGciOiJIUzI1NiIs...",
        "expires_at": 1642694400,
        "issued_at": 1642691400
    },
    "tenant-456": {
        "token": "eyJhbGciOiJSUzI1NiIs...",
        "expires_at": 1642698000,
        "issued_at": 1642695000
    }
}
```

## Security Considerations

### Best Practices

**Token Security:**

- Tokens stored in browser localStorage (client-side only)
- No server-side storage of tokens
- Automatic expiration handling

**Multi-Tenant Isolation:**

- Each tenant token is isolated
- No cross-tenant token usage possible
- Tenant-scoped endpoint validation

**Production Deployment:**

- Use HTTPS for all token transmission
- Configure appropriate token expiration times
- Implement proper client secret management

### Limitations

**Browser Storage:**

- Tokens stored per browser/device
- No cross-device synchronization
- Cleared when browser data is cleared

**Token Scope:**

- Tokens are tenant-specific
- Cannot be used across different tenants
- Require re-authentication for tenant switching

## Troubleshooting

### Common Issues

**Token Not Persisting:**

```bash
# Check browser localStorage support
# Verify localStorage is enabled
# Check for browser privacy/security settings
```

**Token Expired:**

```json
{
    "statusCode": 401,
    "message": "Token has expired"
}
```

- Click 🔒 Authorize to get new token
- Check JWT_EXPIRES_IN configuration

**Wrong Tenant Access:**

```json
{
    "statusCode": 403,
    "message": "Access denied for this tenant"
}
```

- Verify endpoint URL includes correct tenant ID
- Check token was issued for the correct tenant

### Debugging

**Enable Debug Mode:**

```javascript
// Browser console
localStorage.setItem('eudiplo_debug', 'true');
// Reload page to see debug information
```

**Token Inspection:**

```bash
# Decode JWT payload (browser console)
JSON.parse(atob(token.split('.')[1]));
```

## Migration Guide

### From Single-Tenant to Multi-Tenant

**Steps:**

1. Set `OIDC=true` in environment
2. Configure client credentials
3. Clear existing localStorage tokens
4. Re-authenticate with new client credentials
5. Update API endpoint URLs to include tenant ID

**Example Migration:**

```bash
# Before (single-tenant)
POST /vci/offer

# After (multi-tenant)
POST /tenant-123/vci/offer
```

### Backward Compatibility

- Single-tenant mode remains unchanged
- Existing API keys continue to work
- No breaking changes for single-tenant deployments
