# Keycloak Integration Guide

This guide walks you through integrating EUDIPLO with Keycloak using the **Chained AS** mode. In this setup, EUDIPLO acts as an OAuth Authorization Server facade while Keycloak handles user authentication.

## Why Chained AS with Keycloak?

Many organizations already use Keycloak for identity management. The Chained AS mode lets you:

- **Reuse existing Keycloak users and authentication flows** — no need to duplicate identity infrastructure
- **Keep session correlation simple** — EUDIPLO automatically includes `issuer_state` in tokens
- **Access full user claims in webhooks** — ID token and access token claims from Keycloak are passed to your webhook
- **No Keycloak modifications required** — unlike External AS mode, you don't need custom token mappers

For the architecture details, see [Chained AS](../architecture/chained-as.md).

---

## Prerequisites

- A running Keycloak instance (tested with Keycloak 22+)
- EUDIPLO deployed and accessible at a public URL
- A tenant configured in EUDIPLO

---

## Step 1: Configure Keycloak

### Create a Realm (or use existing)

If you don't have a realm yet:

1. Log in to Keycloak Admin Console
2. Click **Create realm**
3. Enter a name (e.g., `eudiplo`) and click **Create**

### Create a Client for EUDIPLO

1. Go to **Clients** → **Create client**
2. Configure the client:

| Setting           | Value                                    |
| ----------------- | ---------------------------------------- |
| Client type       | OpenID Connect                           |
| Client ID         | `eudiplo-chained-as`                     |
| Client authentication | On (confidential client)             |
| Valid redirect URIs | `https://your-eudiplo-url/*/chained-as/callback` |

!!! tip "Redirect URI Pattern"
    
    Use `*` as a wildcard for the tenant name, or specify exact tenant names like `https://eudiplo.example.com/prod/chained-as/callback`.

3. Click **Save**
4. Go to the **Credentials** tab and copy the **Client secret**

### Configure Scopes

Ensure the following scopes are available (they're defaults in Keycloak):

- `openid` — Required for OIDC
- `profile` — Includes name, preferred_username
- `email` — Includes email address

To add custom claims (e.g., employee ID), create a custom scope with a mapper.

---

## Step 2: Configure EUDIPLO

### Update Issuance Configuration

Add the `chainedAs` section to your issuance configuration:

```json
{
  "display": [
    {
      "name": "My Issuer",
      "locale": "en"
    }
  ],
  "chainedAs": {
    "enabled": true,
    "upstream": {
      "issuer": "https://keycloak.example.com/realms/eudiplo",
      "clientId": "eudiplo-chained-as",
      "clientSecret": "paste-your-client-secret-here",
      "scopes": ["openid", "profile", "email"]
    },
    "token": {
      "lifetimeSeconds": 3600
    },
    "requireDPoP": false
  }
}
```

| Field               | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `upstream.issuer`   | Your Keycloak realm URL (must end with `/realms/{realm-name}`)   |
| `upstream.clientId` | The client ID you created in Keycloak                            |
| `upstream.clientSecret` | The client secret from Keycloak's Credentials tab            |
| `upstream.scopes`   | Scopes to request from Keycloak                                  |

### Configure Claims Webhook

To use the authenticated user's claims, configure a webhook on your credential configuration:

```json
{
  "credentialConfigurationId": "EmployeeBadge",
  "claimsWebhook": {
    "url": "https://your-backend.example.com/claims",
    "auth": {
      "type": "apiKey",
      "config": {
        "headerName": "X-API-Key",
        "value": "your-secret-key"
      }
    }
  }
}
```

Your webhook will receive the Keycloak user's claims in the `identity` object:

```json
{
  "session": "abc123",
  "credential_configuration_id": "EmployeeBadge",
  "identity": {
    "iss": "https://keycloak.example.com/realms/eudiplo",
    "sub": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "token_claims": {
      "email": "john.doe@example.com",
      "email_verified": true,
      "preferred_username": "jdoe",
      "given_name": "John",
      "family_name": "Doe"
    }
  }
}
```

---

## Step 3: Create a Credential Offer

Create an offer using the authorization code grant:

```bash
curl -X POST https://eudiplo.example.com/api/offers \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: prod" \
  -d '{
    "credentialConfigurationId": "EmployeeBadge",
    "grant": "authorization_code"
  }'
```

The wallet will:

1. Receive the credential offer
2. Discover the Chained AS metadata from EUDIPLO
3. Redirect the user to EUDIPLO's `/authorize` endpoint
4. EUDIPLO redirects to Keycloak for login
5. After login, Keycloak redirects back to EUDIPLO
6. EUDIPLO issues an access token to the wallet
7. The wallet requests the credential using that token

---

## Step 4: Verify the Integration

### Check Chained AS Metadata

```bash
curl https://eudiplo.example.com/prod/chained-as/.well-known/oauth-authorization-server
```

Should return metadata including the authorization and token endpoints.

### Check JWKS

```bash
curl https://eudiplo.example.com/prod/chained-as/.well-known/jwks.json
```

Should return the public keys used to sign access tokens.

### Test with a Wallet

1. Create a credential offer
2. Scan or click the offer in a compatible wallet
3. You should be redirected to Keycloak's login page
4. After login, the credential should be issued

---

## Troubleshooting

### "Invalid redirect URI" in Keycloak

**Cause**: The redirect URI doesn't match what's configured in Keycloak.

**Fix**: Ensure the **Valid redirect URIs** in your Keycloak client includes:

```
https://your-eudiplo-url/{tenant}/chained-as/callback
```

### "Error during verification of access token jwt"

**Cause**: Token verification failed, often because the JWKS doesn't include the `kid`.

**Fix**: Ensure EUDIPLO is using a recent version with the kid resolution fix. Check that:

```bash
curl https://eudiplo.example.com/prod/chained-as/.well-known/jwks.json | jq '.[0].kid'
```

Returns a non-null key ID.

### Webhook doesn't receive user claims

**Cause**: The Chained AS session wasn't found or claims weren't stored.

**Fix**:

1. Check EUDIPLO logs for "Stored upstream identity claims"
2. Verify the `issuer_state` claim is in the access token
3. Ensure the credential request uses the Chained AS token (not an external token)

### User claims are empty in webhook

**Cause**: Keycloak scopes don't include the claims you need.

**Fix**:

1. In Keycloak, go to **Client scopes** and verify `profile` and `email` are included
2. Check that the client has these scopes assigned (Client → Client scopes tab)
3. For custom claims, create a custom scope with a token mapper

---

## Advanced: Adding Custom Claims

To pass custom user attributes (e.g., employee ID) to EUDIPLO:

### In Keycloak

1. Go to **Client scopes** → **Create client scope**
2. Name it (e.g., `employee`)
3. Go to **Mappers** → **Add mapper** → **By configuration** → **User Attribute**
4. Configure:
   - Name: `employee_id`
   - User Attribute: `employee_id`
   - Token Claim Name: `employee_id`
   - Add to ID token: On
   - Add to access token: On
5. Go to your client → **Client scopes** → **Add client scope** → Select `employee`

### In EUDIPLO

Add the scope to your issuance configuration:

```json
{
  "chainedAs": {
    "upstream": {
      "scopes": ["openid", "profile", "email", "employee"]
    }
  }
}
```

The `employee_id` claim will now appear in your webhook's `token_claims`.

---

## Related Documentation

- [Chained AS Architecture](../architecture/chained-as.md)
- [Issuance Configuration](./issuance/issuance-configuration.md#chained-authorization-server)
- [Webhooks](../architecture/webhooks.md)
