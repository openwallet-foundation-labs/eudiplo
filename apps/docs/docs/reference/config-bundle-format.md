---
title: Config Bundle Format
---

# Config Bundle Format

The format of configuration documents, tenant config folders and export bundles,
as read by the startup import, the bundle API and the CLI. For the workflow
(validate, export, plan, import), see [Configuration as code](../operate/configuration-as-code.md).

## Document envelope

Every portable resource is one JSON document:

```json
{
    "$schema": "https://eudiplo.dev/schemas/v3/PresentationConfigFile.schema.json",
    "metadata": { "generation": 3, "ownership": "file-managed" },
    "spec": { "id": "age-check" }
}
```

| Field                 | Required | Meaning                                                                                                   |
| --------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `$schema`             | yes      | Resource type and format version. Only the canonical URLs below are accepted; they are resolved from schemas bundled with the backend and CLI, never fetched. |
| `metadata.generation` | no       | Integer ≥ 1. A bundle import whose generation is lower than the stored one is blocked (`STALE_GENERATION`); the startup import skips that resource instead. |
| `metadata.ownership`  | no       | `unmanaged` or `file-managed`. Reported on export, where a detached resource is reported as `unmanaged`; ignored on import, which always records `file-managed`. |
| `spec`                | yes      | The desired configuration, without runtime state. The ID is `spec.id`, for clients `spec.clientId`, which is unique across tenants: a client ID another tenant uses blocks the plan (`CLIENT_ID_TAKEN`). |

Tenant, KMS, registrar and issuance settings exist once per tenant and have no ID.
In tenant config folders, the importer also accepts *bare* files (only the
`spec` content) at the known paths and wraps them; a document with an unknown
`$schema` or a newer version than the backend supports is rejected.

## Resource types and versions

The URL is `https://eudiplo.dev/schemas/v<version>/<File>.schema.json`. Older
versions are migrated on import and by `eudiplo config upgrade`; a backend
rejects versions newer than its own.

| Kind                 | `<File>`                      | Current version | Singleton |
| -------------------- | ----------------------------- | --------------- | --------- |
| `Tenant`             | `TenantConfigFile`            | 1               | yes       |
| `Client`             | `ClientConfigFile`            | 2               |           |
| `KmsConfig`          | `KmsConfigFile`               | 1               | yes       |
| `KeyChain`           | `KeyChainConfigFile`          | 2               |           |
| `RegistrarConfig`    | `RegistrarConfigFile`         | 1               | yes       |
| `IssuanceConfig`     | `IssuanceConfigFile`          | 3               | yes       |
| `CredentialConfig`   | `CredentialConfigFile`        | 2               |           |
| `PresentationConfig` | `PresentationConfigFile`      | 3               |           |
| `AttributeProvider`  | `AttributeProviderConfigFile` | 1               |           |
| `WebhookEndpoint`    | `WebhookEndpointConfigFile`   | 1               |           |
| `TrustList`          | `TrustListConfigFile`         | 1               |           |
| `StatusList`         | `StatusListConfigFile`        | 1               |           |

IssuanceConfig v2 and PresentationConfig v2 and v3 were introduced with EUDIPLO
9.0; 8.x cannot read them:

- **IssuanceConfig v2** adds the optional `offerLifetimeSeconds`. A v1 document
  is migrated unchanged.
- **PresentationConfig v2** replaces `registration_cert.body.provided_attestations`
  with the registrar's `provides_attestations` (a list of credential type
  identifiers). The migration removes `provided_attestations` with the warning
  `PROVIDED_ATTESTATIONS_REMOVED`; set `provides_attestations` yourself.
- **PresentationConfig v3** accepts integer and boolean DCQL claim `values`
  besides strings and requires them to be non-empty. A v2 document is migrated
  unchanged; an empty `values` array stops the migration with a validation
  error.

**IssuanceConfig v3** came after 9.0. It adds the optional `verifierKeyPem`
(PEM public key of the list signer) to `walletProviderTrustLists` entries. A v2
document is migrated unchanged; releases that only know v2, such as 9.0, cannot
read v3 files.

**CredentialConfig v2** came with EUDIPLO 10.0. It accepts `x509` as
`frameworkType` of `schemaMeta.trustedAuthorities` entries, with the root
certificate in `value`. A v1 document is migrated unchanged; 9.x cannot read v2
files.

**KeyChain v2** came with EUDIPLO 10.0. It adds the optional `type`
(`standalone` or `internalChain`), which exports write. For a `private-jwk` key
source without `activeJwk` it says whether `jwk` is the signing key or a CA key
under which the import creates a new signing key, as `type` does for
[`POST /api/key-chain/import`](../trust/keys-and-certificates.md#import-a-key-and-certificate).
For `regenerate` it is the type of the new key chain, like
`keySource.keyChainType`; without either, a document with `activeCertificate`
becomes an internal chain. For the other key sources, and for a `regenerate`
key source with both, it must match the key chain they describe, or the plan
reports `KEY_CHAIN_TYPE_MISMATCH`. A v1 document is migrated unchanged;
9.x cannot read v2 files. A bare key chain file with `type`, as
`GET /api/key-chain/{id}/export` writes it, is read as v2.

**Client v2** came with EUDIPLO 10.0 as well. It accepts the roles
`audit:read`, `sessions:read`, `credentials:status` and `keys:manage`. A v1
document is migrated unchanged; 9.x cannot read v2 files.

## Tenant folder layout

Startup import reads `CONFIG_FOLDER` (`/app/config/config` in the image). Every
directory in it, including symlinked ones, is a tenant folder; a tenant that
does not exist yet is created only if its folder contains `info.json`.

```text
<CONFIG_FOLDER>/
├── kms.json                    global KMS providers
└── <tenant-id>/
    ├── info.json               Tenant (name, description, session and status-list defaults)
    ├── kms.json                tenant KMS providers, merged over the global file
    ├── registrar.json
    ├── clients/<id>.json
    ├── key-chains/<id>.json
    ├── attribute-providers/<id>.json
    ├── webhook-endpoints/<id>.json
    ├── trust-lists/<id>.json
    ├── issuance/
    │   ├── issuance.json       IssuanceConfig
    │   ├── credentials/<id>.json
    │   └── status-lists/<id>.json
    ├── presentation/<id>.json
    └── images/<file>           logos and credential images, referenced by file name
```

File names are not significant; the ID comes from the document.

## Bundle layout

An export is a ZIP archive or the same content as one JSON object
(`{ "manifest": …, "documents": [ … ], "assets": [ … ] }`, assets base64-encoded).
The ZIP uses the folder layout above for one tenant, with two differences:
the files sit at the root of the archive, and the issuance settings are stored as
`issuance/config.json`.

`manifest.json` contains:

| Field           | Content                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------- |
| `format`        | `eudiplo.config-bundle`                                                                  |
| `formatVersion` | `2` for new bundles; version 1 bundles are still read                                    |
| `sourceVersion`, `exportedAt`, `tenant` | Origin of the export                                             |
| `resources[]`   | `kind`, `id`, `$schema`, `path`, `sha256`, `ownership`, `generation` per document        |
| `assets[]`      | `path`, `contentType`, `sha256` per binary file                                          |
| `requirements[]`| Values the target must supply: `code`, `resource`, `path`, `message`, `placeholder`      |
| `warnings[]`    | Migration warnings                                                                       |

**Integrity and limits.** Backend and CLI verify that resource identities, paths
and SHA-256 checksums match the manifest. Duplicate resources, unsafe paths and
ZIP entries not listed in the manifest are rejected. A ZIP may have at most
50 MiB compressed, 100 MiB expanded and 10,000 entries.

## Secret and key policy

Exports never contain secret values or database-held private keys:

| Value                                                                 | In the export                                                | Requirement code         | On import                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------ | --------------------------------------------------------------------- |
| Retrievable secrets (KMS, registrar, webhook and attribute-provider credentials, upstream client secrets of chained authorization servers) | `${…}` placeholder | `SECRET_REQUIRED`        | Set the environment variable or replace the value                    |
| Client secrets (stored as bcrypt hash)                                | `${…}` placeholder                                           | `CLIENT_SECRET_REQUIRED` | Supply a secret, or `"secret": "!generate"` to get a new one once in `generatedSecrets` |
| Private keys of `db` key chains                                       | `keySource: { "type": "required", "publicJwk": … }`          | `PRIVATE_KEY_REQUIRED`   | Supply `private-jwk`, or `{ "type": "regenerate" }` for new key material |
| Keys in an external KMS                                               | `keySource: { "type": "external-reference", provider, externalKeyId, publicJwk }` | -  | The target provider must reach the same key; checked by signing a challenge |
| Sessions, status values, caches                                       | not exported                                                 | -                        | -                                                                     |

A secret that is not set, such as the client secret of a registrar account without one, is left out of the export and adds no requirement.

`regenerate` keeps the key chain ID but creates a new cryptographic identity:
certificates and anything bound to the old key must be renewed.

A `private-jwk` key source takes one of two forms:

- With only `jwk`, the document is imported like
  [`POST /api/key-chain/import`](../trust/keys-and-certificates.md#import-a-key-and-certificate)
  and accepts only that request's fields. To restore an exported internal
  chain, put its root CA key from `GET /api/key-chain/{id}/export` into `jwk`,
  remove `activeCertificate` and keep `"type": "internalChain"`: EUDIPLO keeps
  the root CA certificate and creates a new signing key under it. Without
  `type` and rotation, the root CA key itself becomes the signing key.
- With `activeJwk` as well, it stores an internal chain as given, in the
  database: `jwk` is the root CA key and `crt` holds exactly its certificate,
  `activeJwk` is the signing key and `activeCertificate` its certificate,
  which may be followed by the root certificate. Both certificates must be
  PEM and match their keys, the root certificate must be a CA certificate,
  and `kmsProvider` must be `db` or left out; the plan blocks the resource
  otherwise. Exports never contain the signing key of an internal chain
  ([key chain export](../trust/keys-and-certificates.md#import-a-key-and-certificate)),
  so this form needs key material you hold outside EUDIPLO.

**Placeholders.** Any string value can be `${VAR}` or `${VAR:default}`
(uppercase letters, digits, `_`; an empty variable counts as unset). Values are
substituted once and not interpreted again. In tenant folders, unresolved
placeholders are handled according to `CONFIG_VARIABLE_STRICT`:

| Value                    | Effect                                                                 |
| ------------------------ | ---------------------------------------------------------------------- |
| `skip` (default), `abort`, `true` | Error; the import of this tenant fails, other tenants continue |
| `ignore`, `false`        | Warning; the placeholder stays as literal text                         |

## Import modes and plan actions

| Mode      | Existing resource                        | Resource missing from the bundle                                   |
| --------- | ---------------------------------------- | ------------------------------------------------------------------ |
| `create`  | `skip` (warning `RESOURCE_EXISTS`)       | kept                                                               |
| `upsert`  | `update` or `unchanged`                  | kept                                                               |
| `replace` | `update` or `unchanged`                  | `delete`, only if it was imported earlier from the same source     |

| Plan action | Meaning                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------- |
| `create`    | The resource will be created                                                                |
| `update`    | The resource will change; the plan lists redacted field changes                            |
| `unchanged` | Already matches, or a key chain document this source already applied (see below); only ownership metadata may be updated |
| `skip`      | Exists and is left alone: in `create` mode (`RESOURCE_EXISTS`), in a startup import when the resource was detached from that folder (`RESOURCE_DETACHED`) or has a newer stored generation (`STALE_GENERATION`), or because it is the tenant's encryption key chain (`KEY_CHAIN_ID_RESERVED`) |
| `delete`    | Will be removed (`replace` mode)                                                            |
| `blocked`   | Cannot be applied, for example `STALE_GENERATION`, `MISSING_RESOURCE_REFERENCE`, `STATUS_LIST_LAYOUT_IMMUTABLE`, a missing secret or key, or `TRUST_LIST_IN_USE` on a trust list that `replace` would delete while a configuration still references it ([Delete a trust list](../trust/trust-lists.md#delete-a-trust-list)). One blocked item blocks the whole plan |

A `KmsConfig` or `RegistrarConfig` document replaces the stored resource: fields it leaves out are removed, and the plan lists their removal. A `KeyChain` document replaces the stored key material, and also the type, description and rotation policy:

- The plan lists `type` as the import creates it, also for a document without `type` ([KeyChain v2](#resource-types-and-versions)).
- A `description` it leaves out is removed.
- Without `rotationPolicy`, rotation is disabled.
- A rotation value it leaves out or sets to `null` is not set. Exception: a `private-jwk` key source without `activeJwk` is imported like `POST /api/key-chain/import`, so with rotation enabled a missing `intervalDays` becomes 90 and a missing `certValidityDays` 365, and with rotation disabled no intervals are stored.

The plan lists these values as they will be stored. For the other kinds, a top-level field the document leaves out keeps its stored value.

A `KeyChain` document that is identical to the one last applied from the same source (the same config folder, or bundles whose manifest names the same tenant) plans `unchanged` while the key chain is `file-managed`, without comparing it with the stored key chain: importers add key IDs, EUDIPLO creates the signing key of a CA key, and rotation or registrar enrollment replace keys and certificates later. These changes stay, so certificates EUDIPLO created during the import are only renewed by rotation. Reattaching always applies the folder version. To apply an unchanged document again, for example to regenerate a key, raise `metadata.generation`; in a bundle, also update the document's `sha256` in `manifest.json`.

The tenant's encryption key chain is managed by EUDIPLO and is not configuration: exports leave it out, and plans neither change nor delete it. A `KeyChain` document with its ID, such as the one exports of earlier versions contain, is skipped (warning `KEY_CHAIN_ID_RESERVED`).

The import pipeline is: decode, verify checksums, migrate to the current
versions, validate, check references and external keys, plan, apply in
dependency order (for example key chains before issuance configs), record
`file-managed` ownership. Applying needs the `planFingerprint` of the reviewed
plan; a changed bundle, mode or target state fails with `CONFIG_PLAN_STALE`.
Status lists keep their capacity and bit size: import a new list ID for a
different layout.

## Management API

All endpoints act on the tenant of the access token and accept `tenant:admin` or
`tenants:manage` ([roles](roles.md)), except where noted below.

| Endpoint                                                          | Purpose                                   |
| ----------------------------------------------------------------- | ----------------------------------------- |
| `GET /api/config-bundles/export?format=zip\|json`                  | Export the tenant (default `json`)        |
| `POST /api/config-bundles/plan?mode=…`                            | Plan a JSON bundle                        |
| `POST /api/config-bundles/plan/archive?mode=…`                    | Plan a ZIP bundle (multipart field `bundle`) |
| `POST /api/config-bundles/import?mode=…&planFingerprint=…`        | Apply a JSON bundle                       |
| `POST /api/config-bundles/import/archive?mode=…&planFingerprint=…` | Apply a ZIP bundle; `replace` also needs `confirmReplace=true` |
| `POST /api/config-bundles/documents/upgrade`                      | Upgrade one document to the current version |
| `GET /api/config-bundles/operations`, `GET …/operations/:id`      | Latest 50 operation reports, or one report |
| `POST /api/config-bundles/operations/:id/acknowledge-interruption?confirmWorkerStopped=true` | Release the lock of an interrupted operation |
| `GET /api/config-bundles/resources`                               | Ownership and generation of every resource |
| `GET /api/config-bundles/resources/:kind`                         | Ownership and generation of one kind's resources |
| `POST /api/config-bundles/resources/:kind/:id/detach`             | Make a `file-managed` resource `detached`  |
| `POST /api/config-bundles/resources/:kind/:id/reattach/plan`      | Plan resetting a resource to its version in `CONFIG_FOLDER` |
| `POST /api/config-bundles/resources/:kind/:id/reattach?planFingerprint=…` | Apply that plan and make the resource `file-managed` again |

Exports, imports, detach and reattach actions are recorded in the tenant audit log.

`GET /api/config-bundles/resources/:kind` also accepts the roles that change
resources of that kind, so screens can lock file-managed resources for them:

| Kind                                                                    | Also readable with                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------- |
| `Tenant` (session and status list settings)                             | `issuance:manage`, `presentation:manage`                |
| `KeyChain`                                                              | `issuance:manage`, `presentation:manage`, `keys:manage` |
| `WebhookEndpoint`, `TrustList`                                          | `issuance:manage`, `presentation:manage`                |
| `IssuanceConfig`, `CredentialConfig`, `AttributeProvider`, `StatusList` | `issuance:manage`                                       |
| `PresentationConfig`                                                    | `presentation:manage`                                   |
| `Client`                                                                | `clients:manage`                                        |
| `RegistrarConfig`                                                       | `registrar:manage`                                      |
| `KmsConfig`                                                             | no other role                                           |
