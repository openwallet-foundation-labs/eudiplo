# Tenant-Based Architecture

EUDIPLO uses a **tenant-based architecture** that enables you to manage configurations and data for multiple clients or environments within a single deployment.  
This model is designed for **multi-tenancy**: a single EUDIPLO instance can serve multiple **organizations** (e.g., relying parties, issuers, verifiers) or **environments** (e.g., staging, testing, production) while keeping their data and configurations separate.

You do not need to deploy separate applications for each tenant; instead, all tenants are centrally managed through one deployment.

---

## Tenant Isolation

Each tenant is logically isolated. Isolation is currently implemented via a `tenantId` column in all database entities, with the following guarantees:

- **Separate configurations**: Tenant-specific settings stored in the database.
- **Isolated database records**: All queries scoped by `tenantId`.
- **Independent key management**: Cryptographic keys are bound to a tenant context.
- **Dedicated session management**: Sessions are created and validated per tenant.
- **Individual credential configurations**: Issuance and presentation templates can differ per tenant.

> For now, separation is **row-based** via `tenantId`.  
> Future improvements may include **per-tenant databases** or **row-level security (RLS)** enforcement for stronger isolation.

All API calls are tenant-scoped. Access control and endpoint protection are covered in the [Authentication](../api/authentication.md) documentation.

---

## Tenant Lifecycle

A tenant goes through several stages:

- **Provisioning (Create Tenant):** A tenant is initialized on first use. Default configurations (keys, session settings) are created when calling the `/client` endpoint.
- **Enable:** The tenant becomes active; sessions, keys, and credential templates can be used.
- **Suspend:** A tenant can be disabled (e.g., revoking OIDC client access). Data remains in place but is inaccessible.
- **Re-Enable:** Suspended tenants can be reactivated without data loss.
- **Delete:** A full removal workflow, including key destruction and data wiping, will be added.

---

## Tenant Management

When a protected endpoint is called, EUDIPLO will extract the tenant id and the roles from the passed JWT that needs to be passed. Different endpoint require different roles, see the [Protected Endpoints](../api/authentication.md#protected-endpoints) section in the [Authentication](../api/authentication.md) documentation for more details.

### Client Management via Web Client

- Clients can be either managed by EUDIPLO by storing the clientSecrets in the database or by using an external OIDC provider like Keycloak.
- The web client authenticates against Keycloak and interacts with EUDIPLO using the provided access token.

From the UI you can:

- Create and delete tenants
- Manage the tenants' clients
- Manage the issuance and presentation configs of the tenants.

> Even with tenant management privileges, users will **only see tenant-scoped data**.  
> EUDIPLO enforces tenant context based on the **subject claim** of the access token.

### Client Management via the API

The `/tenant` endpoint allows programmatic management of tenants.
The `/client` endpoint allows programmatic management of clients. Based on the access token the tenant context is extracted to perform actions on the specific tenant's clients.

### Authentication Methods

Instead of client ID/secret, you may use any authentication method supported by your OIDC provider.  
EUDIPLO only validates the **access token**; it does not care how authentication was performed. When using EUDIPLO as the OIDC provider, only clientID + clientSecret is supported.

---

## Security Considerations

- **Access control:** All API calls are validated against tenant context and roles embedded in the access token.
- **Auditability:** All operations are logged with `tenantId` for traceability.

See also:

- [Authentication](../api/authentication.md)
- [Key Management](./key-management.md)
- [Credential Configuration](../getting-started/issuance/credential-configuration.md)
