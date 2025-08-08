# Authentication & Security

EUDIPLO's presentation system implements comprehensive security measures to
protect user data and ensure secure credential verification. This guide covers
authentication requirements, security best practices, and privacy
considerations.

---

## API Authentication

### OAuth 2.0 Bearer Tokens

All presentation management endpoints require OAuth 2.0 authentication:

```bash
curl -X 'GET' \
  'http://localhost:3000/presentation-management' \
  -H 'Authorization: Bearer eyJhb...npoNk'
```

The bearer token must:

- Be obtained from EUDIPLO's OAuth 2.0 authorization server
- Include appropriate scopes (`api:read`, `api:write`)
- Be included in the `Authorization` header
- Be valid and not expired

### Tenant Isolation

EUDIPLO provides strict tenant isolation:

- **Token-based scoping**: Each token is associated with a specific tenant
- **Data isolation**: Tenants cannot access each other's configurations or data
- **Resource separation**: Presentation configurations are tenant-specific
- **Session isolation**: Presentation sessions are scoped to the requesting
  tenant

---

## Credential Verification Security

### Supported Verification Methods

| Check Type                 | Description                                | Implementation                   |
| -------------------------- | ------------------------------------------ | -------------------------------- |
| **Signature Verification** | Validates cryptographic signatures         | JWS/JWK verification             |
| **Issuer Trust**           | Verifies issuer against trusted registries | Certificate chain validation     |
| **Revocation Status**      | Checks if credential is revoked            | OAuth Token Status Lists         |
| **Expiration Validation**  | Ensures credential is not expired          | `exp` claim validation           |
| **Binding Verification**   | Validates key binding if present           | Proof-of-possession verification |

---

## Privacy Protection

### Data Minimization

EUDIPLO implements strict data minimization principles:

```json
{
    "data_handling": {
        "collected_data": "Only requested claims",
        "storage_duration": "Session-based, automatically cleaned",
        "purpose_limitation": "Defined in registration certificate",
        "user_consent": "Explicit consent for each presentation"
    }
}
```

### Selective Disclosure

Use SD-JWT credentials for fine-grained privacy control:

```json
{
    "dcql_query": {
        "credentials": [
            {
                "id": "pid",
                "format": "dc+sd-jwt",
                "claims": [
                    {
                        "path": ["age_over_18"]
                    }
                ]
            }
        ]
    }
}
```

**Benefits:**

- Users only reveal necessary attributes
- Cryptographic privacy guarantees
- Reduced exposure of sensitive information

---

## Session Security

### Session Management

EUDIPLO creates secure sessions for each presentation request:

```json
{
    "session": {
        "id": "session-abc123",
        "created_at": "2024-08-08T10:30:00Z",
        "expires_at": "2024-08-08T11:00:00Z",
        "status": "pending",
        "security_level": "high"
    }
}
```

### Session Properties

| Property              | Description                          | Security Benefit               |
| --------------------- | ------------------------------------ | ------------------------------ |
| **Time-limited**      | Sessions expire automatically        | Prevents replay attacks        |
| **Single-use**        | Each session is for one presentation | Prevents reuse attacks         |
| **Encrypted storage** | Session data is encrypted at rest    | Protects against data breaches |
| **Audit logging**     | All session events are logged        | Enables security monitoring    |

### Session Cleanup

EUDIPLO automatically cleans up session data:

- **Automatic expiration**: Sessions expire after 30 minutes
- **Data purging**: Sensitive data is securely deleted
- **Audit retention**: Only security logs are retained
- **GDPR compliance**: Personal data is not stored long-term

---

## Webhook Security

### Securing Webhook Endpoints

Protect your webhook endpoints that receive verified presentations:

```json
{
    "webhook": {
        "url": "https://your-backend.com/presentation-webhook",
        "headers": {
            "Authorization": "Bearer your-secret-token",
            "X-API-Key": "your-api-key"
        }
    }
}
```

### Webhook Payload Validation

Validate incoming webhook payloads:

```javascript
// Example webhook handler
app.post('/presentation-webhook', (req, res) => {
    // 1. Verify authentication
    const authHeader = req.headers.authorization;
    if (!verifyAuthToken(authHeader)) {
        return res.status(401).send('Unauthorized');
    }

    // 2. Validate payload structure
    const { sessionId, requestId, verifiedClaims } = req.body;
    if (!sessionId || !requestId || !verifiedClaims) {
        return res.status(400).send('Invalid payload');
    }

    // 3. Process verified claims
    processVerifiedClaims(verifiedClaims);

    res.status(200).send('OK');
});
```

### HTTPS Requirements

- **Always use HTTPS** for webhook endpoints
- **Validate TLS certificates** to prevent man-in-the-middle attacks
- **Use strong authentication** tokens for webhook requests
- **Implement rate limiting** to prevent abuse

---

## Troubleshooting Security Issues

### Common Authentication Problems

#### Invalid Bearer Token

```bash
HTTP/1.1 401 Unauthorized
{
    "error": "invalid_token",
    "error_description": "The access token is invalid or expired"
}
```

**Solution**: Refresh your OAuth token or obtain a new one.

### Webhook Security Issues

#### Webhook Authentication Failure

```bash
# Check webhook endpoint authentication
curl -X 'POST' \
  'https://your-backend.com/presentation-webhook' \
  -H 'Authorization: Bearer your-secret-token' \
  -H 'Content-Type: application/json' \
  -d '{"test": "payload"}'
```

#### TLS Certificate Problems

- Verify certificate validity and chain
- Check for certificate expiration
- Ensure proper hostname matching

---

## Next Steps

- Review [API Guide](api-guide.md) for secure implementation patterns
- Explore [Integration Examples](integration-examples.md) with security
  considerations
