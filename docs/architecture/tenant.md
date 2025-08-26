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

When a protected endpoint is called, the system checks if the tenant exists. If not, EUDIPLO will automatically set it up. This may lead to longer latency on the first request, but subsequent requests are faster.

### Client Management via Web Client

- Currently supported with **Keycloak** as external OIDC provider.
- Users with the `manage-account` role can manage tenants at `/clients`.
- The web client authenticates against Keycloak and interacts with EUDIPLO using the provided access token.

From the UI you can:

- **Create new clients** (provision a tenant)
- **Enable/disable clients** (toggle active state)
- **Remove clients** (currently soft delete; no EUDIPLO wipe yet)
- **Share configurations** via URL (clicking the share icon copies a tenant URL with parameters)

> Even with management privileges, users will **only see tenant-scoped data**.  
> EUDIPLO enforces tenant context based on the **subject claim** of the access token.

### Client Management via the API

The `/tenant` endpoint allows programmatic management of tenants. Keep in mind when using an external OIDC provider, you still need to call the POST `/tenant` endpoint to create the default values.

### Authentication Methods

Instead of client ID/secret, you may use any authentication method supported by your OIDC provider.  
EUDIPLO only validates the **access token**; it does not care how authentication was performed.

---

## Security Considerations

- **Access control:** All API calls are validated against tenant context embedded in the access token.
- **Auditability:** All operations are logged with `tenantId` for traceability.
  1- **Admin Role:** Certain lifecycle actions (e.g., deletion) will require a **super admin** credential beyond tenant admins.

See also:

- [Authentication](../api/authentication.md)
- [Key Management](./key-management.md)
- [Credential Configuration](../getting-started/issuance/credential-configuration.md)
