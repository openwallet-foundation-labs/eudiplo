# Credential Configuration

Credential configurations define the structure and properties of individual
credentials. Each credential type has its own configuration file.

---

## Basic Structure

**Example Credential Configuration (PID):**

```json
--8<-- "assets/config/root/issuance/credentials/pid.json"
```

---

## Configuration Fields

### Required Fields

- `id`: **REQUIRED** - Unique identifier for the credential configuration.
- `description`: **REQUIRED** - Human-readable description of the credential. Will not be displayed to the end user.
- `config`: **REQUIRED** - Entry for
  [credential_configuration_supported](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-issuer-metadata:~:text=the%20logo%20image.-,credential_configurations_supported,-%3A%20REQUIRED.%20Object%20that).
  The name of the file will be used as the key in the configuration.
    - `format`: **REQUIRED** - The format of the credential, only `dc+sd-jwt` is
    currently supported.
    - `display`: **REQUIRED** - Display configuration for the credential,
    including name, description, locale, colors, and images.
- `vct`: **REQUIRED** -
  [VC Type Metadata](https://www.ietf.org/archive/id/draft-ietf-oauth-sd-jwt-vc-09.html#name-sd-jwt-vc-type-metadata)
  provided via the `/credentials/vct/{id}` endpoint. This link will
  automatically added into the credential.

### Optional Fields

- `keyId`: **OPTIONAL** - Unique identifier for the [key](./advanced-features.md#signing-key) used to sign the credential. If not provided, the first key in the key set will be used.
- `lifeTime`: **OPTIONAL** - Credential expiration time in seconds. If
  specified, credentials will include an `exp` claim calculated as
  `iat + lifeTime`.
- `statusManagement`: **OPTIONAL** - Enable OAuth Token Status Lists for
  [credential revocation](./advanced-features.md#status-management-and-revocation). When `true`, credentials include a `status` claim with
  revocation information.
- `keyBinding`: **OPTIONAL** - Enable [cryptographic key binding](./advanced-features.md#cryptographic-key-binding). When `true`,
  credentials include a `cnf` claim with the holder's public key and require
  proof of possession.
- `claims`: **OPTIONAL** - Static claims to include in the credential. Can be
  overridden by webhook responses or claims passed during credential offer.
- `disclosureFrame`: **OPTIONAL** - Defines which claims should be selectively
  disclosable in SD-JWT format.
- `embeddedDisclosurePolicy`: **OPTIONAL** - Defines the [embedded disclosure policy](./advanced-features.md#embedded-disclosure-policy) for the credential.

---

## Claims Configuration

Claims define the data that will be included in the credential. You can specify
static claims directly in the configuration, or they can be provided dynamically
during the issuance process.

### Static Claims

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

### Complex Data Types

Claims support various data types including objects, arrays, and boolean values:

**Object Claims:**

```json
{
  "address": {
    "locality": "KÖLN",
    "postal_code": "51147",
    "street_address": "HEIDESTRAẞE 17"
  },
  "place_of_birth": {
    "locality": "BERLIN"
  }
}
```

**Array Claims:**

```json
{
  "nationalities": ["DE", "EU"]
}
```

**Boolean Claims:**

```json
{
  "age_equal_or_over": {
    "18": true,
    "21": true,
    "65": false
  }
}
```

---

## Selective Disclosure

Use the `disclosureFrame` to make specific claims selectively disclosable in
SD-JWT format:

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

### Nested Selective Disclosure

For complex claims with nested objects, you can specify selective disclosure at
multiple levels:

```json
{
  "disclosureFrame": {
    "_sd": ["given_name", "family_name", "address", "place_of_birth"],
    "address": {
      "_sd": ["locality", "postal_code", "street_address"]
    },
    "place_of_birth": {
      "_sd": ["locality", "country"]
    }
  }
}
```

---

## Display Configuration

The display configuration defines how the credential appears in wallets:

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
        "uri": "<PUBLIC_URL>/issuer.png",
        "url": "<PUBLIC_URL>/issuer.png"
      },
      "background_image": {
        "uri": "<PUBLIC_URL>/credential-bg.png",
        "url": "<PUBLIC_URL>/credential-bg.png"
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

---

## Advanced Features

For more complex credential requirements, see:

- **[Advanced Features](advanced-features.md)** - Learn about key binding,
  status management, and expiration
- **[Authentication](authentication.md)** - Configure OAuth flows and security
- **[API Guide](api-guide.md)** - Create and manage configurations
  programmatically
