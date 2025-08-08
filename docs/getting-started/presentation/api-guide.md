# API Guide

This comprehensive guide provides practical examples for implementing credential
presentation flows using EUDIPLO's API. Learn how to integrate presentation
requests into your applications with real-world examples.

---

## API Overview

EUDIPLO provides a RESTful API for managing credential presentations:

| Endpoint                           | Method   | Purpose                                       |
| ---------------------------------- | -------- | --------------------------------------------- |
| `/presentation-management`         | `GET`    | List all presentation configurations          |
| `/presentation-management`         | `POST`   | Create or update a presentation configuration |
| `/presentation-management/{id}`    | `DELETE` | Delete a presentation configuration           |
| `/presentation-management/request` | `POST`   | Create a presentation request                 |

All endpoints require OAuth 2.0 authentication with appropriate scopes.

---

## Configuration Management

### Create a Presentation Configuration

Store a new presentation configuration that defines what credentials to request:

```bash
curl -X 'POST' \
  'http://localhost:3000/presentation-management' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "employee-verification",
    "dcql_query": {
        "credentials": [
            {
                "id": "employee-card",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": ["https://your-company.com/credentials/vct/employee"]
                },
                "claims": [
                    {
                        "path": ["employee_id"]
                    },
                    {
                        "path": ["department"]
                    },
                    {
                        "path": ["clearance_level"]
                    }
                ]
            }
        ]
    },
    "registrationCert": {
        "body": {
            "privacy_policy": "https://your-company.com/privacy-policy",
            "purpose": [
                {
                    "locale": "en-US",
                    "name": "Employee verification for secure facility access"
                }
            ],
            "contact": {
                "website": "https://your-company.com/contact",
                "email": "privacy@your-company.com",
                "phone": "+1 555 123 4567"
            }
        }
    },
    "webhook": {
        "url": "https://access-control.your-company.com/presentation-webhook"
    }
  }'
```

**Response:**

```json
{
    "id": "employee-verification",
    "status": "created",
    "tenantId": "tenant-abc123"
}
```

### List All Configurations

Retrieve all presentation configurations for your tenant:

```bash
curl -X 'GET' \
  'http://localhost:3000/presentation-management' \
  -H 'Authorization: Bearer eyJhb...npoNk'
```

**Response:**

```json
[
    {
        "id": "employee-verification",
        "dcql_query": {
            "credentials": [
                {
                    "id": "employee-card",
                    "format": "dc+sd-jwt",
                    "meta": {
                        "vct_values": [
                            "https://your-company.com/credentials/vct/employee"
                        ]
                    },
                    "claims": [
                        {
                            "path": ["employee_id"]
                        },
                        {
                            "path": ["department"]
                        }
                    ]
                }
            ]
        },
        "registrationCert": {
            "body": {
                "privacy_policy": "https://your-company.com/privacy-policy",
                "purpose": [
                    {
                        "locale": "en-US",
                        "name": "Employee verification for secure facility access"
                    }
                ]
            }
        },
        "webhook": {
            "url": "https://access-control.your-company.com/presentation-webhook"
        },
        "createdAt": "2024-08-08T10:30:00Z"
    }
]
```

### Update Configuration

Update an existing configuration by posting with the same ID:

```bash
curl -X 'POST' \
  'http://localhost:3000/presentation-management' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "employee-verification",
    "dcql_query": {
        "credentials": [
            {
                "id": "employee-card",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": ["https://your-company.com/credentials/vct/employee"]
                },
                "claims": [
                    {
                        "path": ["employee_id"]
                    },
                    {
                        "path": ["department"]
                    },
                    {
                        "path": ["clearance_level"]
                    },
                    {
                        "path": ["employment_status"]
                    }
                ]
            }
        ]
    },
    "registrationCert": {
        "body": {
            "privacy_policy": "https://your-company.com/privacy-policy",
            "purpose": [
                {
                    "locale": "en-US",
                    "name": "Enhanced employee verification for secure facility access"
                }
            ],
            "contact": {
                "email": "privacy@your-company.com"
            }
        }
    }
  }'
```

### Delete Configuration

Remove a presentation configuration:

```bash
curl -X 'DELETE' \
  'http://localhost:3000/presentation-management/employee-verification' \
  -H 'Authorization: Bearer eyJhb...npoNk'
```

**Response:**

```json
{
    "id": "employee-verification",
    "status": "deleted"
}
```

---

## Creating Presentation Requests

### URI Response Type

Request a presentation with a URI that can be opened in wallets:

```bash
curl -X 'POST' \
  'http://localhost:3000/presentation-management/request' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "response_type": "uri",
    "requestId": "employee-verification"
  }'
```

**Response:**

```json
{
    "uri": "openid4vp://?request_uri=https://your-domain.com/oid4vp/request/abc123&client_id=your-client",
    "session_id": "session-456def"
}
```

### QR Code Response Type

Request a presentation with a QR code for easy scanning:

```bash
curl -X 'POST' \
  'http://localhost:3000/presentation-management/request' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "response_type": "qrcode",
    "requestId": "employee-verification"
  }'
```

**Response:** Binary PNG image data for the QR code

### Override Webhook for Single Request

Override the configured webhook for a specific presentation request:

```bash
curl -X 'POST' \
  'http://localhost:3000/presentation-management/request' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "response_type": "uri",
    "requestId": "employee-verification",
    "webhook": {
        "url": "https://special-handler.your-company.com/webhook"
    }
  }'
```

---

## Implementation Examples

### Basic Age Verification

Create a simple age verification flow:

```bash
# 1. Create age verification configuration
curl -X 'POST' \
  'http://localhost:3000/presentation-management' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "age-verification",
    "dcql_query": {
        "credentials": [
            {
                "id": "pid",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": ["https://your-domain.com/credentials/vct/pid"]
                },
                "claims": [
                    {
                        "path": ["age_over_18"]
                    }
                ]
            }
        ]
    },
    "registrationCert": {
        "body": {
            "privacy_policy": "https://your-domain.com/privacy-policy",
            "purpose": [
                {
                    "locale": "en-US",
                    "name": "Age verification for restricted content access"
                }
            ],
            "contact": {
                "email": "privacy@your-domain.com"
            }
        }
    }
  }'

# 2. Request age verification presentation
curl -X 'POST' \
  'http://localhost:3000/presentation-management/request' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "response_type": "uri",
    "requestId": "age-verification"
  }'
```

### Professional License Verification

Verify professional credentials with multiple claims:

```bash
# 1. Create professional license configuration
curl -X 'POST' \
  'http://localhost:3000/presentation-management' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "license-verification",
    "dcql_query": {
        "credentials": [
            {
                "id": "professional-license",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": ["https://licensing-authority.gov/credentials/vct/professional-license"]
                },
                "claims": [
                    {
                        "path": ["license_number"]
                    },
                    {
                        "path": ["license_type"]
                    },
                    {
                        "path": ["holder_name"]
                    },
                    {
                        "path": ["expiration_date"]
                    },
                    {
                        "path": ["issuing_authority"]
                    }
                ]
            }
        ]
    },
    "registrationCert": {
        "body": {
            "privacy_policy": "https://your-domain.com/privacy-policy",
            "purpose": [
                {
                    "locale": "en-US",
                    "name": "Professional license verification for service authorization"
                }
            ],
            "contact": {
                "website": "https://your-domain.com/contact",
                "email": "compliance@your-domain.com",
                "phone": "+1 555 987 6543"
            }
        }
    },
    "webhook": {
        "url": "https://license-verification.your-domain.com/webhook"
    }
  }'

# 2. Request license verification
curl -X 'POST' \
  'http://localhost:3000/presentation-management/request' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "response_type": "uri",
    "requestId": "license-verification"
  }'
```

### Multi-Credential Verification

Request multiple credential types in a single presentation:

```bash
curl -X 'POST' \
  'http://localhost:3000/presentation-management' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "comprehensive-verification",
    "dcql_query": {
        "credentials": [
            {
                "id": "identity",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": ["https://government.gov/credentials/vct/pid"]
                },
                "claims": [
                    {
                        "path": ["given_name"]
                    },
                    {
                        "path": ["family_name"]
                    }
                ]
            },
            {
                "id": "employment",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": ["https://employer.com/credentials/vct/employee"]
                },
                "claims": [
                    {
                        "path": ["employee_id"]
                    },
                    {
                        "path": ["department"]
                    }
                ]
            },
            {
                "id": "certification",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": ["https://cert-authority.org/credentials/vct/certification"]
                },
                "claims": [
                    {
                        "path": ["certification_level"]
                    },
                    {
                        "path": ["valid_until"]
                    }
                ]
            }
        ]
    },
    "registrationCert": {
        "body": {
            "privacy_policy": "https://your-domain.com/privacy-policy",
            "purpose": [
                {
                    "locale": "en-US",
                    "name": "Comprehensive verification for high-security access"
                }
            ],
            "contact": {
                "email": "security@your-domain.com"
            }
        }
    }
  }'
```

---

## Webhook Integration

### Webhook Handler Implementation

Example webhook handler in Node.js/Express:

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/presentation-webhook', (req, res) => {
    try {
        const { sessionId, requestId, status, verifiedClaims } = req.body;

        // Validate the webhook payload
        if (!sessionId || !requestId || !verifiedClaims) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        // Process based on presentation type
        switch (requestId) {
            case 'employee-verification':
                handleEmployeeVerification(verifiedClaims);
                break;
            case 'age-verification':
                handleAgeVerification(verifiedClaims);
                break;
            case 'license-verification':
                handleLicenseVerification(verifiedClaims);
                break;
            default:
                console.log('Unknown request type:', requestId);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function handleEmployeeVerification(claims) {
    const employeeData = claims['employee-card'];
    if (employeeData) {
        // Grant access based on employee data
        grantFacilityAccess(
            employeeData.employee_id,
            employeeData.clearance_level,
        );
    }
}

function handleAgeVerification(claims) {
    const pidData = claims['pid'];
    if (pidData && pidData.age_over_18) {
        // Allow access to restricted content
        allowRestrictedAccess();
    }
}

function handleLicenseVerification(claims) {
    const licenseData = claims['professional-license'];
    if (licenseData) {
        // Verify license is valid and not expired
        const isValid = validateLicense(licenseData);
        if (isValid) {
            authorizeService(licenseData.license_number);
        }
    }
}

app.listen(3001, () => {
    console.log('Webhook server running on port 3001');
});
```

### Webhook Payload Structure

EUDIPLO sends the following payload to your webhook:

```json
{
    "sessionId": "session-abc123",
    "requestId": "employee-verification",
    "status": "completed",
    "verifiedClaims": {
        "employee-card": {
            "employee_id": "EMP001234",
            "department": "Engineering",
            "clearance_level": "Level 3",
            "employment_status": "Active"
        }
    },
    "verificationDetails": {
        "timestamp": "2024-08-08T10:35:00Z",
        "issuer_verified": true,
        "signature_valid": true,
        "not_revoked": true,
        "not_expired": true
    }
}
```

---

## Error Handling

### Common API Errors

#### Configuration Not Found

```bash
HTTP/1.1 404 Not Found
{
    "error": "configuration_not_found",
    "message": "No presentation configuration found with ID 'unknown-config'"
}
```

#### Invalid DCQL Query

```bash
HTTP/1.1 400 Bad Request
{
    "error": "invalid_dcql",
    "message": "DCQL query structure is invalid",
    "details": "Missing required field 'credentials'"
}
```

#### Authentication Error

```bash
HTTP/1.1 401 Unauthorized
{
    "error": "invalid_token",
    "message": "The access token is invalid or expired"
}
```

### Error Recovery

Implement proper error handling in your integration:

```javascript
async function createPresentationRequest(requestId) {
    try {
        const response = await fetch('/presentation-management/request', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                response_type: 'uri',
                requestId: requestId,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`API Error: ${error.message}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to create presentation request:', error);

        // Implement retry logic for transient errors
        if (error.message.includes('rate limit')) {
            await new Promise((resolve) => setTimeout(resolve, 60000));
            return createPresentationRequest(requestId); // Retry
        }

        throw error;
    }
}
```

---

## Testing

### Testing with Swagger UI

EUDIPLO provides a Swagger UI for API testing:

1. Navigate to `http://localhost:3000/api`
2. Authenticate using OAuth 2.0
3. Test presentation configuration endpoints
4. Generate QR codes for wallet testing

### Integration Testing

Example test for presentation configuration:

```javascript
const { expect } = require('chai');
const request = require('supertest');

describe('Presentation API', () => {
    let authToken;
    let configId;

    beforeEach(async () => {
        authToken = await getAuthToken();
        configId = 'test-config-' + Date.now();
    });

    it('should create a presentation configuration', async () => {
        const config = {
            id: configId,
            dcql_query: {
                credentials: [
                    {
                        id: 'test-credential',
                        format: 'dc+sd-jwt',
                        meta: {
                            vct_values: [
                                'https://test.com/credentials/vct/test',
                            ],
                        },
                        claims: [{ path: ['test_claim'] }],
                    },
                ],
            },
            registrationCert: {
                body: {
                    privacy_policy: 'https://test.com/privacy',
                    purpose: [
                        {
                            locale: 'en-US',
                            name: 'Test purpose',
                        },
                    ],
                    contact: { email: 'test@test.com' },
                },
            },
        };

        const response = await request(app)
            .post('/presentation-management')
            .set('Authorization', `Bearer ${authToken}`)
            .send(config)
            .expect(201);

        expect(response.body.id).to.equal(configId);
    });

    it('should create a presentation request', async () => {
        const response = await request(app)
            .post('/presentation-management/request')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                response_type: 'uri',
                requestId: configId,
            })
            .expect(201);

        expect(response.body).to.have.property('uri');
        expect(response.body).to.have.property('session_id');
    });
});
```

---

## Best Practices

### API Design

- **Use meaningful configuration IDs** that describe the verification purpose
- **Implement idempotent operations** for configuration updates
- **Cache configurations** to reduce API calls
- **Handle rate limits** gracefully with exponential backoff

### Security

- **Validate all webhook payloads** before processing
- **Use HTTPS everywhere** for secure communication
- **Implement proper error handling** without exposing sensitive data
- **Log security events** for audit and monitoring

### Performance

- **Use webhook endpoints** for asynchronous processing
- **Implement connection pooling** for high-volume scenarios
- **Monitor API response times** and optimize accordingly
- **Cache authentication tokens** until expiration

---

## Next Steps

- Explore [Integration Examples](integration-examples.md) for complete
  implementation scenarios
- Review [Authentication](authentication.md) for security best practices
