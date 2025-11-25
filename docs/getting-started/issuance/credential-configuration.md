# Credential Configuration

Credential configurations define the structure and properties of individual
credentials. Each credential type has its own configuration file.

---

## Basic Structure

Each credential configuration is a JSON object that defines how a specific credential type should be issued. The configuration includes metadata, display information, claims, and various optional features like key binding and status management.

For a complete configuration example, see the [Complete Configuration Example](#complete-configuration-example) section at the bottom of this page.

!!! Info

    The data object for the import can be found in the [API Documentation](../../../api/openapi/#credentialconfigcreate)

---

## Configuration Fields

### Required Fields

- `id`: **REQUIRED** - Unique identifier for the credential configuration that will be used to reference this credential in the issuance metadata or in the credential offer.
- `config`: **REQUIRED** - Entry for
  [credential_configuration_supported](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-issuer-metadata:~:text=the%20logo%20image.-,credential_configurations_supported,-%3A%20REQUIRED.%20Object%20that).
    - `format`: **REQUIRED** - The format of the credential, only `dc+sd-jwt` is
      currently supported.
    - `display`: **REQUIRED** - Display configuration for the credential,
      including name, description, locale, colors, and images.

### Optional Fields

- `description`: **OPTIONAL** - Human-readable description of the credential. Will not be displayed to the end user.
- `vct`: **OPTIONAL** -
  [VC Type Metadata](https://www.ietf.org/archive/id/draft-ietf-oauth-sd-jwt-vc-09.html#name-sd-jwt-vc-type-metadata)
  provided via the `/{tenantId}/credentials-metadata/vct/{id}` endpoint. This link will
  automatically added into the credential.
- `keyId`: **OPTIONAL** - Unique identifier for the key used to sign the credential. If not provided, the first key in the key set will be used. See [Signing Key](#signing-key) for details.
- `lifeTime`: **OPTIONAL** - Credential expiration time in seconds. If
  specified, credentials will include an `exp` claim calculated as
  `iat + lifeTime`. See [Credential Expiration](#credential-expiration) for details.
- `statusManagement`: **OPTIONAL** - Enable OAuth Token Status Lists for
  credential revocation. When `true`, credentials include a `status` claim with
  revocation information. See [Status Management and Revocation](#status-management-and-revocation) for details.
- `keyBinding`: **OPTIONAL** - Enable cryptographic key binding. When `true`,
  credentials include a `cnf` claim with the holder's public key and require
  proof of possession. See [Cryptographic Key Binding](#cryptographic-key-binding) for details.
- `claims`: **OPTIONAL** - Static claims to include in the credential. Can be
  overridden by webhook responses or claims passed during credential offer.
- `claimsWebhook`: **OPTIONAL** - Webhook to receive claims for the issuance process. See [Webhooks](../../architecture/webhooks.md#claims-webhook) for details.
- `notificationWebhook`: **OPTIONAL** - Webhook to send notifications about the issuance process. See [Webhooks](../../architecture/webhooks.md#notification-webhook) for details.
- `disclosureFrame`: **OPTIONAL** - Defines which claims should be selectively
  disclosable in SD-JWT format.
- `embeddedDisclosurePolicy`: **OPTIONAL** - Defines the embedded disclosure policy for the credential. See [Embedded Disclosure Policy](#embedded-disclosure-policy) for details.
- `schema`: **OPTIONAL** - JSON schema for validating the credential claims.

---

## Fetching Claims

Claims define the data that will be included in the credential. This section covers how to configure claims at the credential configuration level.

!!! info "Claims Priority System"

    EUDIPLO supports multiple ways to provide claims (configuration-level and offer-level), with a priority system that determines which claims are used. For a complete explanation of the claims priority order and when to use each method, see [Passing Claims](index.md#passing-claims) in the Issuance Overview.

### Static Claims

You can specify static claims directly in the credential configuration. These claims will be used as defaults for every credential issued using this configuration:

```json
{
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
    }
}
```

Static claims are useful for:

- Default values for all credentials of this type
- Fixed metadata (e.g., issuing country, issuing authority)
- Development and testing scenarios

### Claims Webhook

For dynamic claim retrieval, you can configure a webhook that will be called during the issuance process to fetch claims:

```json
{
    "claimsWebhook": {
        "url": "https://your-backend.com/api/claims",
        "headers": {
            "Authorization": "Bearer your-token"
        }
    }
}
```

The webhook will receive information about the issuance session and must return the claims to be included in the credential.

Claims webhooks are useful when:

- Claims need to be fetched from an external system or database
- Claims should be personalized based on the authentication context
- Claims depend on real-time data

For detailed information about webhook implementation, payload structure, and examples, see [Claims Webhook](../../architecture/webhooks.md#claims-webhook).

---

## Notification Webhook

You can configure a webhook to receive notifications about the issuance process. This allows you to track the status of credential issuance and take appropriate actions:

```json
{
    "notificationWebhook": {
        "url": "https://your-backend.com/api/notifications",
        "headers": {
            "Authorization": "Bearer your-token"
        }
    }
}
```

The notification webhook will be called at various stages of the issuance process, such as:

- When a credential is successfully issued
- When an issuance request fails
- When a credential is accepted by the holder

For more details about the webhook implementation and payload structure, see [Notification Webhook](../../architecture/webhooks.md#notification-webhook).

!!! Info

    When a webhook is configured on credential config level, it will will sent the notification to this endpoint and not also to the one provided in the issuance config. It can also be overwritten via the credential offer.

---

## Selective Disclosure

Use the `disclosureFrame` to make specific claims selectively disclosable in
[SD-JWT](https://www.rfc-editor.org/rfc/rfc9901.html) format:

```json
{
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
    }
}
```

This configuration allows:

- Individual disclosure of personal information fields
- Selective disclosure of address components
- Holders can choose which claims to reveal during presentation

---

## Display Configuration

The display configuration defines how the credential appears in wallets as defined in the [OID4VCI spec](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-issuer-metadata-p) for the credential metadata:

```json
{
    "display": [
        {
            "name": "Personal Identity Document",
            "description": "Official identity credential",
            "locale": "en-US",
            "background_color": "#FFFFFF",
            "text_color": "#000000",
            "logo": {
                "uri": "issuer.png"
            },
            "background_image": {
                "uri": "credential-bg.png"
            }
        }
    ]
}
```

### Display Fields

- `name`: Display name for the credential
- `description`: Brief description of the credential
- `locale`: Language/locale (e.g., "en-US", "de-DE")
- `background_color`: Background color (hex format)
- `text_color`: Text color (hex format)
- `logo`: Issuer logo configuration
- `background_image`: Background image for the credential

!!! Info

    When no uri is passed, EUDIPLO will resolve the image based the storage system, see the [image configuration](../../architecture/configuration-import.md#image-configuration). If the image cannot be found, the URI will be ignored.

---

## Signing Key

The signing key is used to create the digital signature for the credential. It is essential for ensuring the integrity and authenticity of the credential. If none is provided, the first key in the key set will be used. The matching certificate will be included in the `x5c` field of the issued credential.

### Configuration

```json
{
    "keyId": "signing-key-1"
}
```

!!! note

    Keys can be managed through the `/keys` API endpoint.

---

## Cryptographic Key Binding

Cryptographic key binding ensures that a credential can only be used by the
holder who possesses the corresponding private key. This is enabled through the
`keyBinding` configuration option.

### Configuration

```json
{
    "keyBinding": true
}
```

### How It Works

When `keyBinding` is enabled:

- The credential includes a `cnf` (confirmation claim) containing the holder's
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
    "statusManagement": true
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

!!! info

    When a session is deleted, the relationship between the sessionId and the issued credentials is still stored to be able to revoke the credentials. Only the sessionId and the index is stored, no other personal data.

### Benefits

- Real-time revocation capability
- Standards-compliant status tracking
- Verifiers can check credential validity
- Granular control over credential lifecycle

### Status Configuration

By default EUDIPLO will create a status list where each credential is managed with one bit. This means only Valid and Revoked status is possible. To support suspension or other states like defined [specification](https://www.ietf.org/archive/id/draft-ietf-oauth-status-list-13.html#name-status-types-values), you need to update the configuration options by setting the `STATUS_BITS` options at least to `2`.

!!! warning "TODO"

    Move status configuration to the issuance config: <https://github.com/openwallet-foundation-labs/eudiplo/issues/276>

--8<-- "docs/generated/config-status.md"

!!! info

    More granular configuration is planned for the future. When a tenant is created, it will use the same status list for all credentials. Automatic creation of new lists or dedicated lists per credential configuration is planned for the future.

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

---

## Complete Configuration Example

Here's a complete example of a credential configuration (PID - Personal Identity Document) that demonstrates many of the available features:

```json
--8<-- "assets/config/root/issuance/credentials/pid.json"
```

This example includes:

- **Required fields**: `id`, `config` with format and display information
- **Optional fields**: `description`, `vct`, `keyId`, `lifeTime`, `statusManagement`, `keyBinding`
- **Claims**: Static claims that will be included in every issued credential
- **Selective disclosure**: `disclosureFrame` defining which claims can be selectively disclosed
- **Display configuration**: How the credential appears in wallets, including colors, logos, and images

You can use it as a template or use the generated [JSON Schema](https://github.com/openwallet-foundation-labs/eudiplo/blob/main/schemas/CredentialConfigCreate.schema.json) to create your own credential configurations by modifying the fields according to your requirements.
