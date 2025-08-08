# API Guide

This guide provides step-by-step instructions for using the EUDIPLO issuance
APIs, including creating configurations, managing credentials, and starting
issuance flows.

---

## Configuration Management

### Creating Credential Configurations

Credential configurations are managed via the `/issuer-management/credentials`
endpoint:

```bash
curl -X 'POST' \
  'http://localhost:3000/issuer-management/credentials' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "pid",
    "config": {
      "format": "dc+sd-jwt",
      "display": [
        {
          "name": "Personal ID",
          "description": "Official identity credential",
          "locale": "en-US"
        }
      ]
    },
    "keyBinding": true,
    "statusManagement": true,
    "lifeTime": 3600,
    "claims": {
      "given_name": "ERIKA",
      "family_name": "MUSTERMANN"
    },
    "disclosureFrame": {
      "_sd": ["given_name", "family_name"]
    }
  }'
```

#### Response

```json
{
  "id": "pid",
  "tenantId": "your-tenant-id",
  "config": { ... },
  "claims": { ... },
  "disclosureFrame": { ... },
  "keyBinding": true,
  "statusManagement": true,
  "lifeTime": 3600
}
```

### Retrieving Credential Configurations

Get all credential configurations for your tenant:

```bash
curl -X 'GET' \
  'http://localhost:3000/issuer-management/credentials' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk'
```

Get a specific credential configuration:

```bash
curl -X 'GET' \
  'http://localhost:3000/issuer-management/credentials/pid' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk'
```

### Updating Credential Configurations

```bash
curl -X 'PUT' \
  'http://localhost:3000/issuer-management/credentials/pid' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "pid",
    "config": { ... },
    "lifeTime": 7200
  }'
```

### Deleting Credential Configurations

```bash
curl -X 'DELETE' \
  'http://localhost:3000/issuer-management/credentials/pid' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk'
```

---

## Issuance Configuration Management

### Creating Issuance Configurations

Issuance configurations are managed via the `/issuer-management/issuance`
endpoint:

#### Simple Pre-Authorized Flow

```bash
curl -X 'POST' \
  'http://localhost:3000/issuer-management/issuance' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "simple-citizen-pass",
    "authenticationConfig": {
      "method": "none"
    },
    "credentialConfigs": [
      {
        "id": "citizen"
      }
    ]
  }'
```

#### External Authentication Flow

```bash
curl -X 'POST' \
  'http://localhost:3000/issuer-management/issuance' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "authenticated-employee-badge",
    "authenticationConfig": {
      "method": "auth",
      "config": {
        "authUrl": "https://company-auth.example.com/login",
        "webhook": {
          "url": "https://hr-api.example.com/verify",
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
    ],
    "notifyWebhook": {
      "url": "https://hr-api.example.com/notify",
      "auth": {
        "type": "apiKey",
        "config": {
          "headerName": "x-api-key",
          "value": "notification-key"
        }
      }
    }
  }'
```

#### Presentation-During-Issuance Flow

```bash
curl -X 'POST' \
  'http://localhost:3000/issuer-management/issuance' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "citizen-with-pid-verification",
    "authenticationConfig": {
      "method": "presentationDuringIssuance",
      "config": {
        "presentation": {
          "type": "pid",
          "webhook": {
            "url": "http://localhost:8787/process"
          }
        }
      }
    },
    "credentialConfigs": [
      {
        "id": "citizen"
      }
    ],
    "notifyWebhook": {
      "url": "http://localhost:8787/notify",
      "auth": {
        "type": "apiKey",
        "config": {
          "headerName": "x-api-key",
          "value": "foo-bar"
        }
      }
    }
  }'
```

### Retrieving Issuance Configurations

```bash
curl -X 'GET' \
  'http://localhost:3000/issuer-management/issuance' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk'
```

Get a specific issuance configuration:

```bash
curl -X 'GET' \
  'http://localhost:3000/issuer-management/issuance/citizen-with-pid-verification' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk'
```

---

## Creating Credential Offers

To start the issuance flow, you need to create a credential offer using an
**issuance configuration ID**. This is done by calling the
`/issuer-management/offer` endpoint.

### Request Parameters

- **`issuanceId`** (required): The ID of the issuance configuration to use
- **`credentialConfigurationIds`** (optional): Override the credential
  configurations defined in the issuance config
- **`values`** (optional): Override claims for specific credentials

### How It Works

1. You provide an `issuanceId` to specify which issuance configuration to use
2. The issuance configuration defines which credentials will be issued and
   authentication requirements
3. Optionally, you can override the default credentials using
   `credentialConfigurationIds`
4. Optionally, you can provide custom claims using the `values` parameter

### Response Types

Via the `response_type` parameter, you can specify how the response should be
formatted:

- `uri`: Returns a URI that the user can open in their wallet to start the
  issuance flow
- `qrcode`: Returns a QR code that the user can scan with their wallet to start
  the issuance flow

While the `qrcode` is good for easy testing with the Swagger UI, the `uri` is
recommended to also receive the session ID in the response that is needed to
fetch information about the session later on.

### Basic Credential Offer

Using the default credentials defined in the issuance configuration:

```bash
curl -X 'POST' \
  'http://localhost:3000/issuer-management/offer' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "response_type": "uri",
    "issuanceId": "citizen-with-pid-verification"
  }'
```

#### Response

```json
{
    "credential_offer_uri": "openid-credential-offer://...",
    "session": "59d22466-b403-4b37-b1d0-20163696ade7"
}
```

### Credential Offer with Overridden Credentials

Override which credentials to issue while using the same issuance configuration:

```bash
curl -X 'POST' \
  'http://localhost:3000/issuer-management/offer' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "response_type": "uri",
    "issuanceId": "citizen-with-pid-verification",
    "credentialConfigurationIds": ["employee-badge", "parking-permit"]
  }'
```

### Credential Offer with Custom Claims

Override claims for specific credentials:

```bash
curl -X 'POST' \
  'http://localhost:3000/issuer-management/offer' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "response_type": "uri",
    "issuanceId": "employee-onboarding",
    "values": {
      "employee-badge": {
        "employee_id": "EMP12345",
        "department": "Engineering",
        "valid_until": "2024-12-31"
      }
    }
  }'
```

### QR Code Response

```bash
curl -X 'POST' \
  'http://localhost:3000/issuer-management/offer' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "response_type": "qrcode",
    "issuanceId": "simple-citizen-pass"
  }'
```

**Important:** The `issuanceId` is always required and determines the base
configuration. The `credentialConfigurationIds` parameter allows you to override
which specific credentials are issued, while the `values` parameter allows you
to override claims.

---

## Session Management

### Retrieving Session Information

```bash
curl -X 'GET' \
  'http://localhost:3000/session/59d22466-b403-4b37-b1d0-20163696ade7' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhb...npoNk'
```

#### Response

```json
{
    "id": "59d22466-b403-4b37-b1d0-20163696ade7",
    "status": "completed",
    "tenantId": "your-tenant-id",
    "issuanceId": "citizen-with-pid-verification",
    "createdAt": "2024-08-08T10:30:00Z",
    "updatedAt": "2024-08-08T10:35:00Z",
    "notifications": [
        {
            "id": "notif-123",
            "event": "credential_accepted",
            "timestamp": "2024-08-08T10:35:00Z"
        }
    ]
}
```

### Session Status Values

- `active`: Session is in progress
- `completed`: Credential successfully issued
- `expired`: Session timed out
- `failed`: Issuance failed

---

## Error Handling

### Common Error Responses

#### Configuration Not Found

```json
{
    "statusCode": 404,
    "message": "Issuance configuration with id 'invalid-config' not found",
    "error": "Not Found"
}
```

#### Invalid Configuration

```json
{
    "statusCode": 400,
    "message": [
        "config must be an object",
        "keyBinding must be a boolean value"
    ],
    "error": "Bad Request"
}
```

#### Authentication Error

```json
{
    "statusCode": 401,
    "message": "Unauthorized",
    "error": "Unauthorized"
}
```

### HTTP Status Codes

- `200`: Success
- `201`: Created successfully
- `400`: Bad request (validation error)
- `401`: Unauthorized
- `404`: Resource not found
- `409`: Conflict (e.g., ID already exists)
- `500`: Internal server error

---

## Next Steps

- Learn about [Revocation](revocation.md) management
- Explore [Advanced Features](advanced-features.md) for enhanced functionality
