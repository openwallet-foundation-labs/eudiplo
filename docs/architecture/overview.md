# Architecture Overview

**EUDIPLO** is a lightweight middleware designed to bridge the gap between
existing systems and the emerging ecosystem of **EUDI Wallets**. Instead of
implementing complex protocols such as OpenID4VP, SD-JWT, or DIDComm themselves,
developers can run EUDIPLO as a standalone Docker container and interact with it
via simple APIs or configuration files.

It acts as an **adapter** between trusted infrastructure and local applications
or web services, supporting both **single-tenant** and **multi-tenant**
deployments.

---

## Purpose

The EUDI Wallet ecosystem introduces new technical standards and trust models
that are non-trivial to implement correctly. EUDIPLO handles these standards for
you, allowing existing systems to:

- **Issue** verifiable credentials
- **Verify** presentations
- **Manage** cryptographic keys securely
- **Persist** session data
- **Run in a self-contained Docker deployment**

---

## Deployment

EUDIPLO is shipped as a Docker image. It can be run with minimal setup via a
`.env` file. You can mount:

- a `config/` directory for SQLite data or credential configuration
- optional integration with Vault for key storage

EUDIPLO can be deployed as:

- a **standalone local service** (e.g., during development)
- a **backend service** in production (e.g., behind a gateway)

you can examples of deployments in the
[deployment](https://github.com/cre8/eudiplo/tree/main/deployment) directory.

---

## Integration Patterns

You can use EUDIPLO as:

- An **internal credential issuance service** for your citizen portal, education
  platform, or company registry
- A **verifier bridge** to validate wallets without deeply integrating OpenID4VP
  etc.
- A **testing sandbox** for experimenting with EUDI protocols

---

## Extensibility

EUDIPLO is modular and extensible:

- Add new key management backends (e.g., AWS KMS)
- Customize issuance templates
- Extend the API layer with business-specific endpoints

---

## Tenant-Based Architecture

EUDIPLO is built on a **tenant-based architecture** that allows you to isolate
configurations and data for different clients or environments. This means you
can run multiple instances of EUDIPLO, each serving a different tenant or
client, while sharing the same codebase.

#### Tenant Isolation

Each tenant has:

- **Separate configurations**: Managed in the database
- **Isolated database records**: All entities include `tenantId` field
- **Independent key management**: Tenant-specific cryptographic keys
- **Dedicated session management**: Sessions scoped to tenant
- **Individual credential configurations**: Per-tenant issuance and presentation
  templates

> For now the separation in the database is done by a `tenantId` field in all
> entities. In the future, we may support separate databases per tenant.
