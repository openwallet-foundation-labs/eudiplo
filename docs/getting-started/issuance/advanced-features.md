# Advanced Credential Features

This guide covers the advanced features available in EUDIPLO credential
configurations, including cryptographic key binding, status management, and
credential expiration.

---

## Cryptographic Key Binding

Cryptographic key binding ensures that a credential can only be used by the
holder who possesses the corresponding private key. This is enabled through the
`keyBinding` configuration option.

### Configuration

```json
{
    "config": {
        "format": "dc+sd-jwt",
        "display": [
            {
                "name": "Secure Credential",
                "description": "Cryptographically bound credential"
            }
        ]
    },
    "keyBinding": true,
    "claims": {
        "given_name": "ERIKA",
        "family_name": "MUSTERMANN"
    }
}
```

### How It Works

When `keyBinding` is enabled:

- The credential includes a `cnf` (confirmation) claim containing the holder's
  public key
- During credential request, the holder must provide a proof of possession of
  their private key
- The resulting credential can only be presented by the holder who has the
  private key

### Use Cases

- High-value credentials (identity documents, diplomas, licenses)
- Credentials requiring strong authentication
- Preventing credential theft or unauthorized use

---

## Status Management and Revocation

Status management allows credentials to be revoked or suspended using OAuth
Token Status Lists. This is controlled by the `statusManagement` configuration
option.

### Configuration

```json
{
    "config": {
        "format": "dc+sd-jwt",
        "display": [
            {
                "name": "Revocable Credential",
                "description": "Credential with revocation support"
            }
        ]
    },
    "statusManagement": true,
    "claims": {
        "given_name": "ERIKA",
        "family_name": "MUSTERMANN"
    }
}
```

### How It Works

When `statusManagement` is enabled:

- Each issued credential includes a `status` claim with a reference to a status
  list
- The status list tracks the revocation state of individual credentials
- The status list is provided by the service and can be fetched by verifiers
- Credentials can be revoked using the `/session/revoke` endpoint
- The status list is updated immediately upon revocation

### Benefits

- Real-time revocation capability
- Standards-compliant status tracking
- Verifiers can check credential validity
- Granular control over credential lifecycle

---

## Credential Expiration

Credential expiration allows setting a specific lifetime for credentials using
the `lifeTime` configuration option (specified in seconds).

### Configuration

```json
{
    "config": {
        "format": "dc+sd-jwt",
        "display": [
            {
                "name": "Temporary Credential",
                "description": "Time-limited credential"
            }
        ]
    },
    "lifeTime": 3600,
    "claims": {
        "given_name": "ERIKA",
        "family_name": "MUSTERMANN"
    }
}
```

### How It Works

When `lifeTime` is specified:

- The credential includes an `exp` (expiration) claim
- The expiration time is calculated as: `iat` (issued at) + `lifeTime`
- Example: `"lifeTime": 3600` creates credentials valid for 1 hour
- Example: `"lifeTime": 86400` creates credentials valid for 24 hours

### Common Lifetime Values

| Duration | Seconds  | Use Case                    |
| -------- | -------- | --------------------------- |
| 1 hour   | 3600     | Short-term access tokens    |
| 1 day    | 86400    | Daily passes, temporary IDs |
| 1 week   | 604800   | Weekly permits              |
| 1 month  | 2592000  | Monthly subscriptions       |
| 1 year   | 31536000 | Annual licenses             |

---

## Complete Example with All Features

```json
{
    "config": {
        "format": "dc+sd-jwt",
        "display": [
            {
                "name": "Enhanced PID",
                "description": "Personal Identity Document with full security features",
                "locale": "en-US",
                "background_color": "#FFFFFF",
                "text_color": "#000000",
                "logo": {
                    "uri": "<PUBLIC_URL>/issuer.png",
                    "url": "<PUBLIC_URL>/issuer.png"
                },
                "background_image": {
                    "uri": "<PUBLIC_URL>/bdr/credential.png",
                    "url": "<PUBLIC_URL>/bdr/credential.png"
                }
            }
        ]
    },
    "lifeTime": 86400,
    "statusManagement": true,
    "keyBinding": true,
    "claims": {
        "issuing_country": "DE",
        "issuing_authority": "DE",
        "given_name": "ERIKA",
        "family_name": "MUSTERMANN",
        "birth_family_name": "GABLER",
        "birthdate": "1964-08-12",
        "age_birth_year": 1964,
        "age_in_years": 59,
        "age_equal_or_over": {
            "12": true,
            "14": true,
            "16": true,
            "18": true,
            "21": true,
            "65": false
        },
        "place_of_birth": {
            "locality": "BERLIN"
        },
        "address": {
            "locality": "KÖLN",
            "postal_code": "51147",
            "street_address": "HEIDESTRAẞE 17"
        },
        "nationalities": ["DE"]
    },
    "disclosureFrame": {
        "_sd": [
            "issuing_country",
            "issuing_authority",
            "given_name",
            "family_name",
            "birth_family_name",
            "birthdate",
            "age_birth_year",
            "age_in_years",
            "age_equal_or_over",
            "place_of_birth",
            "address",
            "nationalities"
        ],
        "address": {
            "_sd": ["locality", "postal_code", "street_address"]
        }
    },
    "vct": {}
}
```

This configuration enables:

- **Key binding**: Credential bound to holder's key
- **Status management**: Revocation support via status lists
- **Expiration**: 24-hour credential lifetime
- **Selective disclosure**: Claims can be selectively revealed
- **Rich claims**: Complex data types and nested objects
