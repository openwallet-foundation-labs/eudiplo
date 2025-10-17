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
                        "vct_values": ["https://your-company.com/credentials/vct/employee"]
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
