# Supported Protocols

EUDIPLO is **deliberately limited** to protocols that are part of the European
Digital Identity Wallet (EUDI Wallet) ecosystem. This focused scope reduces
implementation complexity, improves long-term maintainability, and ensures a
consistent trust model across services.

Rather than being a general-purpose verifiable credentials broker, EUDIPLO
aligns strictly with the specifications endorsed by the EU regulatory and
technical framework.

## Protocols Supported

| Protocol                                                                                                                         | Description                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [OpenID for Verifiable Credential Issuance (OID4VCI)](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html) | Enables issuers to deliver verifiable credentials to EUDI Wallets using OAuth-based flows. |
| [OpenID for Verifiable Presentations (OID4VP)](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html)              | Allows services to request and verify credentials presented by EUDI Wallet holders.        |
| [Selective Disclosure JWT VC (SD-JWT VC)](https://www.ietf.org/archive/id/draft-ietf-oauth-selective-disclosure-jwt-08.html)     | Data model for credentials allowing selective disclosure of individual claims by the user. |
| [OAuth Token Status List](https://drafts.oauth.net/draft-ietf-oauth-status-list/draft-ietf-oauth-status-list.html)               | Mechanism for determining revocation or suspension status of issued credentials.           |

These standards are evolving in coordination with EU-level pilot projects and
working groups. EUDIPLO tracks these developments closely to provide early,
stable support as specifications mature.

## Why Not More?

By **limiting scope to official EUDI Wallet protocols**, EUDIPLO avoids:

- Incompatibilities with reference implementations
- Bloated code from supporting rarely used formats
- Uncertain trust assumptions from broader ecosystems

This makes EUDIPLO especially suitable for:

- Public sector services integrating with national wallet pilots
- Companies targeting pan-European credential workflows
- Developers seeking a reliable, minimal abstraction layer over complex specs
