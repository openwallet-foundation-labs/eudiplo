# Advanced Credential Features

This guide covers the advanced features available in EUDIPLO credential
configurations, including cryptographic key binding, status management, and
credential expiration.

---

## Signing Key

The signing key is used to create the digital signature for the credential. It is essential for ensuring the integrity and authenticity of the credential. If none is provided, the first key in the key set will be used.

### Configuration

```json
{
    "keyId": "signing-key-1"
}
```

> Keys can be managed through the `/keys` API endpoint.

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

Status management allows credentials to be revoked or suspended using [OAuth
Token Status List](https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/). This is controlled by the `statusManagement` configuration
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

!!! note

    When a session is deleted, the relationship between the sessionId and the issued credentials is still stored to be able to revoke the credentials. Only the sessionId and the index is stored, no other personal data.

### Benefits

- Real-time revocation capability
- Standards-compliant status tracking
- Verifiers can check credential validity
- Granular control over credential lifecycle

### Configuration

By default EUDIPLO will create a status list where each credential is managed with one bit. This means only Valid and Revoked status is possible. To support suspension or other states like defined [specification](https://www.ietf.org/archive/id/draft-ietf-oauth-status-list-13.html#name-status-types-values), you need to update the configuration options by setting the `STATUS_BITS` options at least to `2`.

--8<-- "docs/generated/config-status.md"

> More granular configuration is planned for the future.
> When a tenant is created, it will use the same status list for all credentials. Automatic creation of new lists or dedicated lists per credential configuration is planned for the future.

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

## Embedded Disclosure Policy

The embedded disclosure policy defines rule to which the credential can be disclosed.

There are four supported policy mechanisms:

### None

when policy is set to `none`, then there is no restriction on disclosure and claims can be revealed without any constraints.

```json
{
    "policy": "none"
}
```

### Allow List

When policy is set to `allow`, only relying parties explicitly listed in the credential can access the claims.

```json
{
    "policy": "allowList",
    "values": ["https://relying-party-1.com", "https://relying-party-2.com"]
}
```

### Root of Trust

When policy is set to `rootOfTrust`, only relying parties that have a valid trustchain to the explicitly listed root of trust can access the claims.

```json
{
    "policy": "rootOfTrust",
    "values": ["https://root-of-trust.com"]
}
```

### Attestation Based

When policy is set to `attestationBased`, only relying parties that can present a valid attestation can access the claims.

```json
{
    "policy": "attestationBased",
    "values": [
        {
            "claims": [
                {
                    "id": "card",
                    "path": ["given_name"]
                }
            ],
            "credentials": [
                {
                    "id": "card",
                    "format": "sd-jwt-dc",
                    "meta": {
                        "vct_values": "https://example.com/member-card"
                    },
                    "trusted_authorities": [
                        {
                            "type": "aki",
                            "values": ["s9tIpPmhxdiuNkHMEWNpYim8S8Y"]
                        }
                    ]
                }
            ],
            "credential_sets": [
                {
                    "options": [["card"]]
                }
            ]
        }
    ]
}
```
