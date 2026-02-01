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
| [Mobile Driving License (mDOC/mDL)](https://www.iso.org/standard/69084.html)                                                     | ISO 18013-5 standard for mobile driving licenses and other mobile documents.               |
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

---

## OIDF Conformance

EUDIPLO has been tested against the **OpenID Foundation (OIDF) Conformance Suite** to ensure strict compliance with protocol specifications:

- ✅ **OID4VCI (OpenID for Verifiable Credential Issuance)** - Conformance tested
- ✅ **OID4VP (OpenID for Verifiable Presentations)** - Conformance tested

These conformance tests validate that EUDIPLO correctly implements the protocol flows, security requirements, and interoperability features specified by the OpenID Foundation.

### Running Conformance Tests

To run the OIDF conformance tests yourself:

1. Deploy EUDIPLO to a publicly accessible instance (required for the hosted OIDF test suite)
2. Run the conformance test suite:

```bash
cd apps/backend
pnpm run test:e2e:oidf
```

These tests execute against your running instance and communicate with the hosted OIDF conformance suite to validate protocol compliance.

For more details on testing, see the [Testing Guide](../development/testing.md#oidf-conformance-tests).
