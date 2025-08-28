# Authentication Flows

The authentication configuration uses a discriminated union pattern that ensures
type safety and proper validation. Each authentication method corresponds to a
specific OpenID4VC flow, and only one method can be active at a time.

---

## Overview

EUDIPLO supports three main authentication flows for credential issuance:

1. **Pre-Authorized Code Flow** (`none`) - No user authentication required
2. **OID4VCI Authorized Code Flow** (`auth`) - External user authentication
3. **OID4VP Flow** (`presentationDuringIssuance`) - Credential presentation
   required

---

## 1. Pre-Authorized Code Flow (`none`)

Used when no user authentication is required. The credential is issued directly
using a pre-authorized code.

### Configuration

```json
{
    "authenticationConfig": {
        "method": "none"
    }
}
```

### Use Cases

- User has logged in previously so no further authentication is needed
- Direct credential issuance without user interaction

### Example Flow

1. Backend service requests credential offer
2. EUDIPLO generates pre-authorized code
3. Wallet uses code to directly retrieve credential
4. No user authentication required

---

## 2. OID4VCI Authorized Code Flow (`auth`)

Used when user authentication is required. The user will be redirected to an
external authentication URL as part of the OID4VCI authorized code flow.

> TODO: has to be tested!!!

### Configuration

```json
{
    "authenticationConfig": {
        "method": "auth",
        "config": {
            "authUrl": "https://auth.example.com/login",
            "webhook": {
                "url": "https://api.example.com/webhook",
                "auth": {
                    "type": "apiKey",
                    "config": {
                        "headerName": "Authorization",
                        "value": "Bearer your-token"
                    }
                }
            }
        }
    }
}
```

### Configuration Fields

- `authUrl`: **REQUIRED** - The URL where users will be redirected for
  authentication
- `webhook`: **OPTIONAL** - Webhook configuration for authentication callbacks

### Use Cases

- Identity verification before credential issuance
- Account-based credential issuance
- Integration with existing authentication systems
- User consent flows

### Example Flow

1. User initiates credential request
2. EUDIPLO redirects user to external auth URL
3. User authenticates with external system
4. External system calls webhook with user data
5. EUDIPLO issues credential based on authenticated user

---

## 3. OID4VP Flow (`presentationDuringIssuance`)

Used when a credential presentation is required before issuance. An OID4VP
request is sent to the wallet to present specific credentials.

### Configuration

```json
{
    "authenticationConfig": {
        "method": "presentationDuringIssuance",
        "config": {
            "presentation": {
                "type": "pid",
                "webhook": {
                    "url": "https://api.example.com/webhook",
                    "auth": {
                        "type": "apiKey",
                        "config": {
                            "headerName": "Authorization",
                            "value": "Bearer your-token"
                        }
                    }
                }
            }
        }
    }
}
```

### Configuration Fields

- `presentation`: **REQUIRED** - Presentation configuration
  - `type`: Type of credential to present (e.g., "pid", "oid4vp")
  - `webhook`: Webhook configuration for processing presented credentials

### Use Cases

- Issuing credentials based on existing credentials
- Step-up authentication with credential presentation
- Verification workflows (e.g., university diploma requires high school
  certificate)
- Identity linking between credentials

### Example Flow

1. User requests new credential
2. EUDIPLO requests presentation of existing credential
3. User presents required credential via OID4VP
4. EUDIPLO validates presentation via webhook
5. New credential is issued based on presented data

---

## Webhook Configuration

All authentication flows can include webhook configurations for external
processing.

### Webhook Structure

```json
{
    "webhook": {
        "url": "https://api.example.com/process",
        "auth": {
            "type": "apiKey",
            "config": {
                "headerName": "x-api-key",
                "value": "your-secret-key"
            }
        }
    }
}
```

### Authentication Types

#### API Key Authentication

```json
{
    "auth": {
        "type": "apiKey",
        "config": {
            "headerName": "Authorization",
            "value": "Bearer your-token"
        }
    }
}
```

---

## Complete Issuance Configuration Examples

### Simple Pre-Authorized Flow

```json
{
    "id": "simple-citizen-pass",
    "authenticationConfig": {
        "method": "none"
    },
    "credentialConfigs": [
        {
            "id": "citizen"
        }
    ]
}
```

### External Authentication Flow

```json
{
    "id": "authenticated-employee-badge",
    "authenticationConfig": {
        "method": "auth",
        "config": {
            "authUrl": "https://company-auth.example.com/login",
            "webhook": {
                "url": "https://hr-api.example.com/verify-employee",
                "auth": {
                    "type": "apiKey",
                    "config": {
                        "headerName": "x-api-key",
                        "value": "hr-system-key"
                    }
                }
            }
        }
    },
    "credentialConfigs": [
        {
            "id": "employee-badge"
        }
    ]
}
```

### Presentation-Based Flow

```json
{
    "id": "university-diploma",
    "authenticationConfig": {
        "method": "presentationDuringIssuance",
        "config": {
            "presentation": {
                "type": "high-school-certificate",
                "webhook": {
                    "url": "https://university-api.example.com/verify-prerequisite",
                    "auth": {
                        "type": "apiKey",
                        "config": {
                            "headerName": "Authorization",
                            "value": "Bearer university-token"
                        }
                    }
                }
            }
        }
    },
    "credentialConfigs": [
        {
            "id": "university-diploma"
        }
    ],
    "notifyWebhook": {
        "url": "https://university-api.example.com/notify-issuance",
        "auth": {
            "type": "apiKey",
            "config": {
                "headerName": "x-api-key",
                "value": "notification-key"
            }
        }
    }
}
```

---

## Choosing the Right Flow

| Flow Type          | When to Use                   |
| ------------------ | ----------------------------- |
| **Pre-Authorized** | User already authenticated    |
| **External Auth**  | User verification required    |
| **Presentation**   | Credential-based verification |

---

## Next Steps

- Learn about [Advanced Features](advanced-features.md) for enhanced security
- Use the [API Guide](api-guide.md) to implement these authentication flows
