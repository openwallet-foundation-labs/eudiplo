# Configuring Presentation Flows

Presentation flow files define what credentials should be requested from the
user and which claims must be disclosed. These files are placed in:

```string
config/presentation/{id}.json
```

Each file corresponds to a specific presentation scenario and uses DCQL to
define the query. Files are not cached and are loaded dynamically at runtime.
The `id` is used to reference the presentation configuration in the API.

---

## Credential Presentation Flow

This flow describes how a backend service requests a credential presentation
(e.g., to authorize a user or verify an attribute). EUDIPLO creates the OID4VP
request and handles the protocol flow with the wallet.

```plantuml
@startuml
actor EUDI_Wallet
participant Middleware
participant End_Service

End_Service -> Middleware : Request OID4VP presentation request
Middleware --> End_Service : Return presentation request link
End_Service -> EUDI_Wallet : Present link to user
EUDI_Wallet -> Middleware : Start OID4VP flow
Middleware <-> EUDI_Wallet : OID4VP presentation exchange
Middleware -> End_Service : Send presented data
@enduml
```

---

## Credential Presentation During Issuance

This flow describes an advanced scenario where the end-user is required to
**present a credential** during the issuance of another credential. This is
useful when a prior attribute (e.g. student ID, PID) is needed to qualify for
the new credential.

```plantuml
@startuml
actor EUDI_Wallet
participant Middleware
participant End_Service

End_Service -> Middleware : Request OID4VCI offer generation
Middleware --> End_Service : Return offer link
End_Service -> EUDI_Wallet : Present offer link to user
EUDI_Wallet -> Middleware : Start OID4VCI flow
Middleware -> EUDI_Wallet : Request credential presentation
EUDI_Wallet -> Middleware : Present credential
Middleware -> End_Service : Send presented credential
End_Service -> Middleware : Provide data for issuance
Middleware <-> EUDI_Wallet : OID4VCI credential issuance
Middleware -> End_Service : Notify successful issuance
@enduml
```

## Example Presentation Request

```json
{
    "dcql_query": {
        "credentials": [
            {
                "id": "pid",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": ["<PUBLIC_URL>/credentials/vct/pid"]
                },
                "claims": [
                    {
                        "path": ["address", "locality"]
                    }
                ]
            }
        ]
    },
    "registrationCert": {
        "body": {
            "privacy_policy": "https://example.com/privacy-policy",
            "purpose": [
                {
                    "locale": "en-US",
                    "name": "To register a new user"
                }
            ],
            "contact": {
                "website": "https://example.com/contact",
                "e-mail": "privacy@example.com",
                "phone": "+1234567890"
            },
            "credentials": [
                {
                    "format": "dc+sd-jwt",
                    "meta": {
                        "vct_values": ["<PUBLIC_URL>/credentials/vct/pid"]
                    },
                    "claims": [
                        {
                            "path": ["address", "locality"]
                        }
                    ]
                }
            ]
        },
        "id": "ea140773-5f7f-4e39-a21c-d2a5f912deb2"
    },
    "webhook": { "url": "http://localhost:8787/consume" }
}
```

---

## Field Breakdown

- `dcql_query`: REQUIRED:
  [Digital Credentials Query Language](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-digital-credentials-query-l)
  Defines the credentials and claims to be requested.
- `registrationCert`: REQUIRED: Contains the legal purpose and contact
  information for processing personal data aligned with the
  [Blueprint](https://bmi.usercontent.opencode.de/eudi-wallet/eidas-2.0-architekturkonzept/flows/Wallet-Relying-Party-Authentication/)
- `webhook`: OPTIONAL: The URL where the verified presentation will be sent
  after the user completes the flow, for more information, see
  [Webhook Integration](./webhooks.md). If not provided, the data can be fetched
  via the session ID returned in the initial request.

> 🔧 `<PUBLIC_URL>` is replaced automatically at runtime based on your
> configured `PUBLIC_URL` value.

---

## How to Test

1. Place your file in `config/presentations/`
2. Check it is loaded via `GET /presentations`
3. Trigger the presentation request vis `/oid4vp` like

```http
curl -X 'POST' \
  'http://localhost:3000/oid4vp' \
  -H 'accept: application/json' \
  -H 'x-api-key: 1234' \
  -H 'Content-Type: application/json' \
  -d '{
  "response_type": "qrcode",
  "requestId": "pid",
}'
```
