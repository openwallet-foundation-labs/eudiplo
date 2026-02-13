| Key | Type | Notes |
| --- | ---- | ----- |
| `OIDC` | `string` | Enable OIDC mode |
| `OIDC_INTERNAL_ISSUER_URL` | `string` | Internal issuer URL in OIDC mode [when OIDC is set → then default=undefined] |
| `OIDC_CLIENT_ID` | `any` | Client ID for OIDC [when OIDC is set → then required] |
| `OIDC_CLIENT_SECRET` | `any` | Client secret for OIDC [when OIDC is set → then required] |
| `OIDC_SUB` | `any` | Claim to use as subject [when OIDC is set → then default="tenant_id"] |
| `OIDC_ALGORITHM` | `any` | Expected JWT alg [when OIDC is set → then default="RS256"] |
| `MASTER_SECRET` | `any` | Local JWT secret (when OIDC is off) - required, minimum 32 characters [when OIDC is set → otherwise required] |
| `JWT_ISSUER` | `any` | Local JWT issuer [when OIDC is set → otherwise default="eudiplo-service"] |
| `JWT_EXPIRES_IN` | `any` | Local JWT expiration [when OIDC is set → otherwise default="24h"] |
| `AUTH_CLIENT_SECRET` | `any` | Client secret (local auth) - required when OIDC is not enabled [when OIDC is set → otherwise required] |
| `AUTH_CLIENT_ID` | `any` | Client ID (local auth) - required when OIDC is not enabled [when OIDC is set → otherwise required] |
