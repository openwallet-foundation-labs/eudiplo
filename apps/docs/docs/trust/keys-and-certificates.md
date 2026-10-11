---
title: Keys and Certificates
---

A key chain is a signing key together with its certificate chain. Each tenant needs one per purpose: an access key chain to sign presentation requests, an attestation key chain to sign credentials, and optionally status list and trust list key chains. Create them in the Web Client under **Cryptographic Assets → Keys → Create Key**, or with the API below; where the private keys live is set by the [KMS provider](../operate/kms.md).

**Prerequisites:** the `issuance:manage` or `presentation:manage` role.

## Usage types

| `usageType`   | Signs                                                                                          | Web Client option                 |
| ------------- | ---------------------------------------------------------------------------------------------- | --------------------------------- |
| `access`      | Presentation requests (it determines the `client_id`), signed issuer metadata, ISO 18013-7 `readerAuth` | Access Certificate                |
| `attestation` | Issued credentials (SD-JWT VC and mDOC)                                                        | Credential Signing (Attestation)  |
| `statusList`  | Status lists for [revocation](../issuance/revocation.md)                                       | Status List Signing               |
| `trustList`   | [Trust lists](trust-lists.md) you publish                                                      | Trust List Signing                |

`encrypt` is reserved for the tenant's encryption key, which EUDIPLO creates and manages itself; it is not listed with the other key chains.

## Key chain types

| Type              | Created with                                                         | Certificate                                                                                                   | On rotation                                    |
| ----------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Standalone        | `POST /api/key-chain` with `"type": "standalone"`                    | Self-signed; subject is the tenant name, DNS name the host of `PUBLIC_URL`                                     | New key with a new self-signed certificate     |
| Internal chain    | `POST /api/key-chain` with `"type": "internalChain"`                 | EUDIPLO creates a root CA (valid 10 years) and a leaf certificate signed by it                                | New leaf key signed by the same root           |
| Imported key      | `POST /api/key-chain/import` with `"type": "standalone"`             | Your chain from `crt` (leaf first), or a self-signed certificate valid 365 days if `crt` is omitted                           | New key with a self-signed certificate (see warning below) |
| External CA chain | `POST /api/key-chain/import` with `"type": "internalChain"`          | `key` is your CA key and the last `crt` entry its CA certificate, or a self-signed CA certificate EUDIPLO creates if `crt` is omitted; EUDIPLO generates leaf keys signed by it | New leaf key signed by your CA                 |

In the Web Client, attestation keys offer **Create Key Chain** (internal chain), **Standalone Key** and **External CA Chain**; access keys offer **Self-Signed Certificate**, **Registrar Enrollment** ([Registrar](registrar.md)) and **External Certificate** (import). The wizard accepts pasted PEM values and PEM, CRT, CER or DER files and checks that key and certificate match.

Use an internal or external CA chain for attestation keys: trust lists publish the CA certificate, so entries stay valid when the leaf key rotates.

## Create a key chain

```bash
curl -X POST "$EUDIPLO_URL/api/key-chain" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "usageType": "attestation",
    "type": "internalChain",
    "description": "Membership signing key",
    "rotationPolicy": { "enabled": true, "intervalDays": 90, "certValidityDays": 365 }
  }'
```

The response is `{ "id": "<key chain id>" }`. `kmsProvider` selects a provider ID from `kms.json`; without it the default provider is used. `certValidityDays` defaults to 365. `intervalDays` is required when `rotationPolicy.enabled` is `true`; without rotation the key is only rotated on request.

## Import a key and certificate

Import material issued by your own PKI or an ecosystem operator with `POST /api/key-chain/import`. Provide exactly one of `key` (EC private key as JWK) or `keyPem` (PKCS#8 PEM, P-256):

```json
{
    "usageType": "access",
    "description": "Access certificate from the ecosystem operator",
    "keyPem": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
    "crt": [
        "-----BEGIN CERTIFICATE-----\n<leaf>\n-----END CERTIFICATE-----",
        "-----BEGIN CERTIFICATE-----\n<intermediate>\n-----END CERTIFICATE-----"
    ]
}
```

For an imported key, the first certificate must contain the public key of the imported private key. For an **external CA chain**, add `"type": "internalChain"` and pass the CA key and a chain whose last certificate is the CA certificate (`CA=true`, matching the key); the certificates before it are not used. EUDIPLO then creates the signing leaf itself, and rotates it with `"rotationPolicy": { "enabled": true, "intervalDays": 30, "certValidityDays": 365 }`. With rotation enabled, a missing `intervalDays` becomes 90 and a missing `certValidityDays` 365; without rotation, no intervals are stored.

Without `type`, as in files written before 10.0, the import decides from `rotationPolicy`: with rotation enabled it is an external CA chain, unless `crt` is one self-signed certificate that is not a CA (the export of a standalone key chain); otherwise it is an imported key.

To provision key chains as files, put the same JSON into `config/<tenant>/key-chains/`; see [Configuration as Code](../operate/configuration-as-code.md). `GET /api/key-chain/{id}/export` returns a key chain in this format, with its `type`, and needs `tenant:admin` or `tenants:manage`. For an internal or external CA chain it contains the CA key and certificate but not the signing key, so its import keeps the CA and creates a new signing key, as a rotation does. For the `db` provider the export contains the private key; for an external KMS only the public key, because the private key never leaves the KMS, so that file cannot be imported again. For 9.x exports, see the [10.0 upgrade guide](../upgrade/9.x-to-10.0.md#configuration-files). A startup import does not apply an unchanged file again and so renews no certificate ([details](../reference/config-bundle-format.md#import-modes-and-plan-actions)).

## Rotate keys

- **Automatic:** once a day, every key chain with `rotationPolicy.enabled` and an `intervalDays` that has passed since creation or the last rotation is rotated.
- **Manual:** `POST /api/key-chain/{id}/rotate` rotates immediately (`204`).
- **Change the policy:** `PUT /api/key-chain/{id}` with `rotationPolicy` or `description`. Enabling rotation needs `intervalDays`, unless the key chain already has one.

Rotation creates a new key and certificate as listed in the table above. Credentials issued before keep their certificate chain in `x5c`; with an internal or external CA chain, old and new credentials chain to the same CA, so trust lists need no update.

:::warning[Rotating imported keys]
Rotating a standalone or imported key chain replaces its certificate with a self-signed one. Do not rotate key chains whose certificate comes from a registrar or an external PKI; import the renewed key and certificate instead, or use an external CA chain.
:::

There is no certificate signing request (CSR) export. To use certificates from your own CA, import the key with its certificate, or import the CA key as an external CA chain.

## Certificates

Certificates always belong to a key chain. Which one a wallet or verifier has to trust depends on its use:

| Certificate                 | Who checks it                                                                 | Typical source                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Access certificate          | Wallets, when they receive a presentation request or signed issuer metadata    | Self-signed for development; registrar or ecosystem operator for production ([wallet requirements](wallet-registrars.md)) |
| Attestation certificate     | Wallets and verifiers, through the `x5c` chain in each credential and a trust list | Internal or external CA chain; your issuer PKI                                              |
| Status list certificate     | Verifiers, as the revocation certificate of your trust list entry             | Standalone or internal chain                                                                    |
| Trust list certificate      | Consumers of your trust list, who pin it as `verifierX509Der`                  | Standalone or internal chain                                                                    |

A presentation configuration uses the access key chain in `accessKeyChainId`, or an access key chain of the tenant when it is not set. Registration certificates are JWTs issued by a registrar, not key chains; see [Registration Certificates](registration-certificates.md).

### Revocation check

Before a key chain signs, EUDIPLO checks that its leaf certificate is within its validity period and, if the certificate names a CRL distribution point, that the CRL does not list it. A key chain whose certificate is expired or revoked does not sign, and the requests that need it fail.

CRLs are usually served over plain HTTP, so a CRL only counts if it names the leaf's issuer and is signed by the issuing CA certificate. EUDIPLO looks for that certificate in the key chain: the certificates after the leaf in `crt`, or the root CA certificate of an internal or external CA chain. If the issuing CA certificate is not there, or no CRL can be fetched or passes these checks, EUDIPLO logs a warning and keeps signing. Self-signed certificates are not checked against a CRL, because no CA can revoke them. Certificates that EUDIPLO creates name no CRL distribution point.
