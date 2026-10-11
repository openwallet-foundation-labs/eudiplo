---
title: Tenants and Access
---

# Tenants and Access

Create tenants, give applications least-privilege API clients, and let people
sign in. Every management endpoint (`/api/...`) needs an OAuth 2.0 bearer token
whose roles and tenant decide what the caller may do; the roles are listed in
the [roles reference](../reference/roles.md).

## Tenants

A tenant is one issuer and/or verifier: its credential, issuance and presentation
configurations, keys, trust lists, sessions and clients belong to it. All
records carry the tenant ID, and every request is scoped to the tenant in the
access token. Tenants have no lifecycle states besides `active`; to take a
tenant offline, delete its clients or the tenant.

### Create a tenant

With a token that has `tenants:manage` (for example the root client below):

```bash
curl -X POST https://eudiplo.example.com/api/tenant \
  -H "Authorization: Bearer $ROOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "acme",
    "name": "Acme GmbH",
    "roles": ["issuance:manage", "presentation:manage", "tenant:admin"]
  }'
```

If you pass `roles`, EUDIPLO also creates the client `acme-admin` with
`clients:manage` plus these roles, and returns its secret once in the response.
Use that client to set up the tenant and to create narrower clients. It can
hand out only `clients:manage` and these roles, unless they include
`tenant:admin` ([granting roles](../reference/roles.md#granting-roles)), so
choose them with that in mind. The root client has no tenant and cannot change
a tenant's clients, but sending `POST /api/tenant` again for the existing
tenant, with its name and all roles the admin client needs, gives that client
the roles; with the built-in server it also returns a new secret.
`DELETE /api/tenant/:id` removes the tenant with its data and files. Tenants can
also be created from a config folder with an `info.json`
([configuration as code](configuration-as-code.md)).

## API authentication

### Built-in OAuth2 server

Without `OIDC`, EUDIPLO issues tokens itself with the client credentials grant:

```bash
curl -X POST https://eudiplo.example.com/api/oauth2/token \
  -d grant_type=client_credentials \
  -d client_id=acme-admin \
  -d client_secret="$CLIENT_SECRET"
```

The client can also send its credentials with HTTP Basic authentication. Tokens
are signed with `MASTER_SECRET` and expire after `JWT_EXPIRES_IN` (default
`24h`). Use them as `Authorization: Bearer <token>`. The Swagger UI of the
management API is at `/api/docs` (its **Authorize** button uses the same
endpoint); the wallet-facing protocol API is documented at `/docs`.

On the first start, EUDIPLO creates the root client from `AUTH_CLIENT_ID` and
`AUTH_CLIENT_SECRET`. It has `tenants:manage` and belongs to no tenant, so it
can create and manage tenants (each new tenant gets a `<tenant>-admin` client)
and rotate client secrets, but cannot call tenant-scoped endpoints such as
clients, issuance or presentation configs. Changing the two variables later does not
change the stored client; rotate its secret with
`POST /api/client/<client-id>/rotate-secret` instead.

### API clients with least privilege

Create one client per application, with only the roles it needs. A token with
`clients:manage` creates clients in its own tenant, with the roles it can hand
out, for example the `acme-admin` client above:

```bash
curl -X POST https://eudiplo.example.com/api/client \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "shop-backend",
    "description": "Issues membership cards and checks age",
    "roles": ["issuance:offer", "presentation:request"],
    "allowedIssuanceConfigs": ["membership"],
    "allowedPresentationConfigs": ["age-check"]
  }'
```

The response contains the generated secret once; it is stored as a bcrypt hash
and cannot be read again. Rotate it with `POST /api/client/:id/rotate-secret`.
Client IDs may contain letters, digits, `.`, `_`, `:` and `-`, and are unique
across all tenants: an ID that is already taken answers `409`.

`allowedIssuanceConfigs` limits the credential configuration IDs the client may
put in offers, `allowedPresentationConfigs` the presentation configurations it
may request. Other IDs are rejected with `403`; an empty or missing list allows
all.

The session endpoints (`/api/session`) need `issuance:offer` or
`presentation:request` and show a client only the sessions of its side:
issuance sessions with `issuance:offer` or `issuance:manage`, presentation
sessions with `presentation:request` or `presentation:manage`. Other sessions
are left out of the list, answer `404` and are not deleted. Changing credential
status (`POST /api/session/revoke`) needs `issuance:offer` or
`issuance:manage`.

Typical role sets:

| Caller                                   | Roles                                                         |
| ---------------------------------------- | ------------------------------------------------------------- |
| Your application backend                 | `issuance:offer`, `presentation:request`                      |
| CI pipeline that imports configuration   | `tenant:admin`                                                |
| Person who configures a tenant           | `issuance:manage`, `presentation:manage`, `clients:manage`, `users:manage`, and the roles they hand out; `tenant:admin` instead also allows key export and KMS settings |
| Platform operator                        | `tenants:manage`, on a client without a tenant                |

`issuance:manage` and `presentation:manage` create, import, rotate and delete
key chains, but exporting a key chain with its private key
(`GET /api/key-chain/{id}/export`) and the tenant KMS provider configuration
(`/api/key-chain/providers/config`), which contains provider credentials, need
`tenant:admin` or `tenants:manage`, like configuration bundles.

A caller hands out only roles it holds, or with `tenant:admin` every role
except `tenants:manage` and `tenant:admin`, and cannot change or take over a
client or user with more rights than its own
([granting roles](../reference/roles.md#granting-roles)).

## External OIDC provider and human users

To let people sign in with their own accounts, set `OIDC` to a Keycloak realm
(OIDC mode always uses Keycloak's admin API). Then:

- EUDIPLO accepts Keycloak access tokens instead of issuing its own; the
  built-in `POST /api/oauth2/token` is disabled.
- The web client signs people in with the authorization code flow and PKCE.
- Clients created through `/api/client` are Keycloak clients, and people are
  managed through `/api/user` (role `users:manage`) or in the web client. Without
  `OIDC`, `/api/user` answers `501`.
- Access tokens must carry the tenant ID in the claim named by `OIDC_SUB`
  (default `tenant_id`) and the roles in `roles` or `realm_access.roles`.

The variables and the Keycloak setup are described in [Keycloak SSO](keycloak.md).
`MASTER_SECRET` is optional in OIDC mode, but the default encryption key is
derived from it; set it, or use another
[encryption key source](encryption-keys.md).
