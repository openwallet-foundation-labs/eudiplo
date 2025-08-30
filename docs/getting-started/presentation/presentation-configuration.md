# Presentation Configuration

This guide covers how to create, manage, and configure presentation requests in
EUDIPLO. Presentation configurations define what credentials and claims should
be requested from users.

---

## Configuration Structure

### Basic Configuration

A presentation configuration consists of three main components:

```json
{
    "id": "unique-identifier",
    "dcql_query": {
        /* DCQL specification */
    },
    "registrationCert": {
        /* Privacy and legal information */
    },
    "webhook": {
        /* Optional webhook configuration */
    }
}
```

### Field Descriptions

| Field              | Type   | Required | Description                                                   |
| ------------------ | ------ | -------- | ------------------------------------------------------------- |
| `id`               | string | ✅       | Unique identifier for the presentation configuration          |
| `dcql_query`       | object | ✅       | DCQL query defining requested credentials and claims          |
| `registrationCert` | object | ❌       | Registration certificate with privacy policy and contact info |
| `webhook`          | object | ❌       | Optional webhook URL for receiving verified presentations     |

---

## DCQL Query Structure

### Basic DCQL Example

```json
{
    "dcql_query": {
        "credentials": [
            {
                "id": "pid",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": [
                        "https://your-domain.com/credentials/vct/pid"
                    ]
                },
                "claims": [
                    {
                        "path": ["given_name"]
                    },
                    {
                        "path": ["family_name"]
                    },
                    {
                        "path": ["birth_date"]
                    }
                ]
            }
        ]
    }
}
```

### Multiple Credential Types

Request different types of credentials in a single presentation:

```json
{
    "dcql_query": {
        "credentials": [
            {
                "id": "identity",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": [
                        "https://your-domain.com/credentials/vct/pid"
                    ]
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
                "id": "address",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": [
                        "https://your-domain.com/credentials/vct/address"
                    ]
                },
                "claims": [
                    {
                        "path": ["street_address"]
                    },
                    {
                        "path": ["locality"]
                    },
                    {
                        "path": ["postal_code"]
                    }
                ]
            }
        ]
    }
}
```

### Nested Claims

Request nested attributes from credential structures:

```json
{
    "dcql_query": {
        "credentials": [
            {
                "id": "employee",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": [
                        "https://your-domain.com/credentials/vct/employee"
                    ]
                },
                "claims": [
                    {
                        "path": ["personal_info", "name"]
                    },
                    {
                        "path": ["employment", "department"]
                    },
                    {
                        "path": ["employment", "position"]
                    },
                    {
                        "path": ["contact", "email"]
                    }
                ]
            }
        ]
    }
}
```

---

## Registration Certificate

### Purpose and Legal Basis

The registration certificate provides legal and privacy information required for
GDPR compliance:

```json
{
    "registrationCert": {
        "body": {
            "privacy_policy": "https://your-domain.com/privacy-policy",
            "purpose": [
                {
                    "locale": "en-US",
                    "name": "Employee identity verification for building access"
                },
                {
                    "locale": "de-DE",
                    "name": "Mitarbeiteridentitätsverifikation für Gebäudezugang"
                }
            ],
            "contact": {
                "website": "https://your-domain.com/contact",
                "email": "privacy@your-domain.com",
                "phone": "+49 123 456 7890"
            }
        }
    }
}
```

### Multi-Language Support

Support multiple languages for better user experience:

```json
{
    "purpose": [
        {
            "locale": "en-US",
            "name": "Age verification for restricted content access"
        },
        {
            "locale": "de-DE",
            "name": "Altersverifikation für den Zugang zu eingeschränkten Inhalten"
        },
        {
            "locale": "fr-FR",
            "name": "Vérification d'âge pour l'accès au contenu restreint"
        }
    ]
}
```

---

## Webhook Configuration

### Basic Webhook Setup

Configure webhooks to receive verified presentations asynchronously:

```json
{
    "webhook": {
        "url": "https://your-backend.com/presentation-webhook",
        "headers": {
            "Authorization": "Bearer your-webhook-secret"
        }
    }
}
```

### Webhook Payload

EUDIPLO sends the following payload to your webhook endpoint:

```json
{
    "sessionId": "session-123",
    "requestId": "identity-verification",
    "status": "completed",
    "verifiedClaims": {
        "pid": {
            "given_name": "John",
            "family_name": "Doe",
            "birth_date": "1990-01-01"
        }
    },
    "timestamp": "2024-08-08T10:30:00Z"
}
```

---

## Configuration Examples

### Age Verification

```json
{
    "id": "age-verification",
    "dcql_query": {
        "credentials": [
            {
                "id": "pid",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": [
                        "https://your-domain.com/credentials/vct/pid"
                    ]
                },
                "claims": [
                    {
                        "path": ["birth_date"]
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
}
```

### Employee Access Control

```json
{
    "id": "employee-access",
    "dcql_query": {
        "credentials": [
            {
                "id": "employee-id",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": [
                        "https://your-domain.com/credentials/vct/employee"
                    ]
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
            "privacy_policy": "https://your-domain.com/privacy-policy",
            "purpose": [
                {
                    "locale": "en-US",
                    "name": "Employee verification for secure area access"
                }
            ],
            "contact": {
                "website": "https://your-domain.com/contact",
                "email": "security@your-domain.com"
            }
        }
    },
    "webhook": {
        "url": "https://access-control.your-domain.com/verify"
    }
}
```

### Professional License Verification

```json
{
    "id": "license-verification",
    "dcql_query": {
        "credentials": [
            {
                "id": "professional-license",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": [
                        "https://your-domain.com/credentials/vct/professional-license"
                    ]
                },
                "claims": [
                    {
                        "path": ["license_number"]
                    },
                    {
                        "path": ["license_type"]
                    },
                    {
                        "path": ["issuing_authority"]
                    },
                    {
                        "path": ["expiration_date"]
                    },
                    {
                        "path": ["holder_name"]
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
                    "name": "Professional license verification for service provision"
                }
            ],
            "contact": {
                "website": "https://your-domain.com/contact",
                "email": "compliance@your-domain.com",
                "phone": "+1 555 123 4567"
            }
        }
    }
}
```

---

## Managing Configurations

### Creating Configurations

Store a new presentation configuration:

```bash
curl -X 'POST' \
  'http://localhost:3000/presentation-management' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "identity-verification",
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
                        "path": ["given_name"]
                    },
                    {
                        "path": ["family_name"]
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
                    "name": "Identity verification"
                }
            ],
            "contact": {
                "email": "privacy@your-domain.com"
            }
        }
    }
  }'
```

### Listing Configurations

Retrieve all presentation configurations for your tenant:

```bash
curl -X 'GET' \
  'http://localhost:3000/presentation-management' \
  -H 'Authorization: Bearer eyJhb...npoNk'
```

### Updating Configurations

Update an existing configuration by posting with the same ID:

```bash
curl -X 'POST' \
  'http://localhost:3000/presentation-management' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "identity-verification",
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
                        "path": ["given_name"]
                    },
                    {
                        "path": ["family_name"]
                    },
                    {
                        "path": ["birth_date"]
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
                    "name": "Enhanced identity verification with age check"
                }
            ],
            "contact": {
                "email": "privacy@your-domain.com"
            }
        }
    }
  }'
```

### Deleting Configurations

Remove a presentation configuration:

```bash
curl -X 'DELETE' \
  'http://localhost:3000/presentation-management/identity-verification' \
  -H 'Authorization: Bearer eyJhb...npoNk'
```
