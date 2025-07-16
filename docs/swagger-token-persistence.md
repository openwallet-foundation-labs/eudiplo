# Swagger UI Token Persistence Guide

## Overview

Your Swagger UI is configured to automatically save and persist JWT access
tokens, making development and testing much more convenient.

## How Token Persistence Works

### 1. Getting Your Token

```bash
curl -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "root",
    "client_secret": "root"
  }'
```

### 2. Using the Token in Swagger UI

1. **Navigate to Swagger UI**: `http://localhost:3000/api`
2. **Click the "Authorize" button** (🔓 lock icon at the top right)
3. **Enter your token**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
4. **Click "Authorize"**
5. **Click "Close"**

### 3. Token Persistence Features

✅ **Automatic persistence**: Token is saved in browser's local storage  
✅ **Page refresh**: Token survives page refreshes  
✅ **New tabs**: Token works across multiple Swagger UI tabs  
✅ **Visual feedback**: Lock icon shows green when authenticated  
✅ **Auto-inclusion**: All API requests automatically include the Bearer token

## Configuration Details

The token persistence is enabled through these Swagger options:

```typescript
swaggerOptions: {
    persistAuthorization: true,     // Core persistence feature
    deepLinking: true,             // Share authenticated URLs
    displayRequestDuration: true,  // Show API timing
    filter: true,                  // Search operations
    tryItOutEnabled: true,         // Enable testing
    docExpansion: 'list',          // Show all operations
    operationsSorter: 'alpha',     // Alphabetical sorting
}
```

## Visual Indicators

- **🔓 Unlocked**: No authentication token set
- **🔒 Locked (Green)**: Valid token is active and persisted
- **Green border**: Authentication section highlighted when active
- **Request duration**: Shows actual API response times

## Troubleshooting

### Token Not Persisting

- Check browser's local storage isn't disabled
- Ensure you're on the same domain
- Clear browser cache if issues persist

### Token Expired

- Get a new token from `/auth/token`
- Click Authorize and update with new token
- Check token expiration time (default: 24h)

### Authentication Errors

- Verify token format: `Bearer <token>`
- Ensure no extra spaces
- Check client credentials are correct

## Pro Tips

1. **Copy full token**: Include the entire JWT string
2. **Use Bearer prefix**: Always prefix with `Bearer `
3. **Test endpoints**: Use "Try it out" to verify authentication
4. **Check responses**: Look for 401 errors if token issues
5. **Monitor expiration**: Tokens expire after 24 hours by default

## Example Workflow

```bash
# 1. Get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"root","client_secret":"root"}' \
  | jq -r '.access_token')

# 2. Use in Swagger UI
echo "Bearer $TOKEN"
# Copy this output and paste into Swagger UI Authorize dialog
```

The token will now be automatically included in all Swagger UI requests and
persist across sessions!
