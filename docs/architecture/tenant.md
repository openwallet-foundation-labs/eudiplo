# Tenant-Based Architecture

EUDIPLO is built on a **tenant-based architecture** that allows you to isolate
configurations and data for different clients or environments. This means you
can run multiple instances of EUDIPLO, each serving a different tenant or
client, while sharing the same codebase.

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

TODO: needs to be aligned
