# API Reference

Eudiplo exposes a REST API based on the OpenAPI 3.0 standard. This interface allows systems to issue credentials, verify presentations, and configure credential behavior through standard HTTP endpoints.

## 📍 OpenAPI Endpoints

You can access the OpenAPI documentation via:

- 🌐 **Swagger UI**: [http://localhost:3000](http://localhost:3000)
- 📄 **OpenAPI Spec (JSON)**: [http://localhost:3000/api-json](http://localhost:3000/api-json)

## 🔑 Well-Known Endpoints

- `GET /.well-known/openid-credential-issuer` — Issuer metadata
- `GET /.well-known/oauth-authorization-server` — Authorization server metadata
- `GET /.well-known/jwks.json` — Public keys in JWKS format

## 🪪 Credential Issuance (OID4VCI)

- `POST /vci/offer` — Get a credential offer
- `POST /vci/credential` — Retrieve a verifiable credential
- `POST /vci/notification` — Notify about issuance events

## 🛂 Authorization (OIDC)

- `GET /authorize` — Authorize endpoint
- `POST /authorize/par` — Pushed Authorization Request (PAR)
- `POST /authorize/token` — Exchange authorization code for token
- `GET /authorize/jwks.json` — JWKS for authorize domain
- `POST /authorize/challenge` — Initiate authorization challenge

## 📘 Credential Configuration

- `GET /credentials/config` — List all credential configurations
- `POST /credentials/config` — Store or update a credential configuration
- `DELETE /credentials/config/{id}` — Delete a specific configuration
- `GET /credentials/vct/{id}` — Retrieve Verifiable Credential Type (VCT) metadata
- `GET /credentials/schema/{id}` — Get JSON Schema for a credential

## 📋 Presentation Verification (OID4VP)

- `POST /oid4vp` — Initiate a presentation request
- `GET /oid4vp/request/{requestId}` — Fetch the request payload
- `GET /oid4vp/request/{requestId}/{session}` — Fetch request with session context
- `POST /oid4vp/response` — Submit presentation response

## 🧪 Presentation Config

- `GET /presentations` — List all configured presentation requests
- `POST /presentations` — Store or update a presentation request config
- `DELETE /presentations/{id}` — Delete a presentation request

## 🔄 Status Management

- `GET /status-management/status-list` — Get the status list for revocation or suspension

---

## 🧰 Schema & Payload Samples

To generate client SDKs or see schema details, download the OpenAPI spec from:
[http://localhost:3000/api-json](http://localhost:3000/api-json)

You can also use tools like:

- [OpenAPI Generator](https://openapi-generator.tech/)
- [Swagger Codegen](https://github.com/swagger-api/swagger-codegen)
