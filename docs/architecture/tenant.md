# Tenant-Based Architecture

EUDIPLO is built on a **tenant-based architecture** that allows you to isolate
configurations and data for different clients or environments. This means you
can run multiple instances of EUDIPLO, each serving a different tenant or
client, while sharing the same codebase.

Each tenant is accessible via a client, more information can be found in the
[Management](../getting-started/management.md) section.

## Tenant Isolation

Each tenant has:

- **Separate configurations**: Managed in the database
- **Isolated database records**: All entities include `tenantId` field
- **Independent key management**: Tenant-specific cryptographic keys
- **Dedicated session management**: Sessions scoped to tenant
- **Individual credential configurations**: Per-tenant issuance and presentation
  templates

> For now the separation in the database is done by a `tenantId` field in all
> entities. In the future, we may support separate databases per tenant.

## Tenant Management

When a protected endpoint is called, the system will check if the tenant is
already set up. If not, it will call the required functions to do so. This can
result in a longer response time for the first request, but subsequent requests
will be faster.

## Deleting a Tenant

This is not yet implemented, since you need some kind of admin credential to
start the process in case it is not triggered by the tenant itself.

TODO: needs to be implemented.
