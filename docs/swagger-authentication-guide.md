# Swagger UI Authentication Guide

This guide shows how to use the enhanced Swagger UI with JWT authentication for
the EUDIPLO Service API.

## Quick Authentication Steps

### 1. **Get an Access Token**

First, call the `/auth/token` endpoint to get your JWT token:

1. Navigate to `/api` in your browser (Swagger UI)
2. Find the **Authentication** section
3. Click on `POST /auth/token`
4. Click **"Try it out"**
5. Enter your client credentials:

```json
{
    "client_id": "root",
    "client_secret": "root"
}
```

6. Click **"Execute"**
7. Copy the `access_token` from the response

### 2. **Authorize in Swagger UI**

1. Click the **🔒 Authorize** button at the top of the Swagger UI
2. In the "bearer (http, Bearer)" dialog:
    - Enter: `Bearer YOUR_ACCESS_TOKEN`
    - Example: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. Click **"Authorize"**
4. Click **"Close"**

### 3. **Use Protected Endpoints**

Now all protected endpoints will automatically include your JWT token in the
`Authorization` header. You'll see a 🔒 icon next to protected endpoints.

## Features

### ✅ **Persistent Authorization**

- Your token stays active even after page refresh
- No need to re-enter the token every time

### ✅ **Visual Indicators**

- 🔒 Icons show which endpoints require authentication
- Green "Authorized" badges confirm authentication status

### ✅ **Request Duration Display**

- See how long each API call takes
- Useful for performance monitoring

### ✅ **Filtering & Search**

- Use the search box to filter endpoints
- Quickly find the endpoints you need

## Available Client Credentials

### Default Client for Testing

| Client ID | Secret | Use Case           |
| --------- | ------ | ------------------ |
| `root`    | `root` | All API operations |

⚠️ **Note**: This is the default credential for development. Use secure secrets
in production!

## Token Information

### Token Properties

- **Type**: JWT (JSON Web Token)
- **Expiration**: 24 hours
- **Format**: `Bearer <token>`
- **Algorithm**: HS256 (single-tenant) or RS256 (multi-tenant)

### Token Payload Example

```json
{
    "sub": "root",
    "client_id": "root",
    "client_name": "Root Client",
    "aud": "eudiplo-service",
    "iss": "eudiplo-service",
    "iat": 1642598400,
    "exp": 1642684800
}
```

## Troubleshooting

### Common Issues

**❌ "Unauthorized" (401) Error**

- Check if your token is expired (24h lifetime)
- Ensure you included "Bearer " before the token
- Verify you clicked "Authorize" after entering the token

**❌ "Invalid client credentials"**

- Double-check your `client_id` and `client_secret`
- Ensure the client is active in the system

**❌ Token disappears after refresh**

- This shouldn't happen with `persistAuthorization: true`
- Try clearing browser cache and re-authorizing

### Manual Authorization Header

If the authorize button doesn't work, you can manually add headers:

1. In any endpoint, click **"Try it out"**
2. Look for the **"Authorization"** parameter
3. Enter: `Bearer YOUR_ACCESS_TOKEN`

## Advanced Usage

### Using with curl

Copy the authorization from Swagger and use it with curl:

```bash
curl -X POST "http://localhost:3000/vci/offer" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "response_type": "uri",
    "credentialConfigurationIds": ["pid"]
  }'
```

### Integration Testing

For automated testing, get tokens programmatically:

```javascript
// Get token
const tokenResponse = await fetch('/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        client_id: 'root',
        client_secret: 'root',
    }),
});

const { access_token } = await tokenResponse.json();

// Use token
const apiResponse = await fetch('/vci/offer', {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
});
```

## Security Best Practices

### Development

- ✅ Use the provided default credential (root/root) for testing
- ✅ Tokens expire automatically after 24 hours
- ✅ Always use HTTPS in production

### Production

- ✅ Replace default secrets with secure random values
- ✅ Implement secret rotation procedures
- ✅ Monitor authentication attempts
- ✅ Use environment variables for configuration

The enhanced Swagger UI makes it easy to test and integrate with the EUDIPLO
Service API while maintaining security best practices!
