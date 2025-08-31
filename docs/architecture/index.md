# Architecture Overview

**EUDIPLO** is a lightweight middleware designed to bridge the gap between
existing systems and the emerging ecosystem of **EUDI Wallets**. Instead of
implementing complex protocols such as OpenID4VP, SD-JWT, or DIDComm themselves,
developers can run EUDIPLO as a standalone Docker container and interact with it
via simple APIs or configuration files.

It acts as an **adapter** between trusted infrastructure and local applications
or web services. EUDIPLO handles the complexities of the EUDI Wallet ecosystem,
allowing you to focus on your core business logic without worrying about the
underlying protocols.

---

## Structure

EUDIPLO is built on a modular architecture, where each module is a plug-and-play component responsible for a specific system function. This design promotes separation of concerns, maintainability, and easy integration of new features.

The core modules include:

- **Database:** Stores application and credential data.
- **Key Management:** Handles secure storage and management of cryptographic keys.
- **Identity and Access Management:** Manages access to the tenant's resources.
- **Storage:** Provides persistent storage for files and artifacts.

Modules are activated via environment variable configuration. You select which backend to use globally for each module by setting the appropriate environment variables before starting EUDIPLO.

> **Note:** EUDIPLO is not designed to set individual database or storage options per tenant. All tenants share the same backend configuration for each module. If you need to switch backends, you are responsible for writing your own migration strategy to move existing data.

This modular approach allows you to run EUDIPLO with simple local backends during development, and swap to scalable, secure services in production—without changing your application code.

For example, switching from local key management to HashiCorp Vault only requires updating your configuration.

```mermaid
flowchart TD
    A(EUDIPLO)
    B{{Databases}}
    C{{Key Management}}
    D{{Identity and Access Management}}
    E{{Storage}}

    A --> B
    B --> B1[SQLite]
    B --> B2[PostgreSQL]

    A --> C
    C --> C1[Unencrypted DB]
    C --> C2[HashiCorp Vault]

    A --> D
    D --> D1[Local]
    D --> D2[Keycloak]

    A --> E
    E --> E1[Local]
    E --> E2[S3]
```

---

## Deployment

EUDIPLO is shipped as a Docker image. It can be run with minimal setup via a
`.env` file. You can mount:

- a `config/` directory for SQLite data or credential configuration
- optional integration with Vault for key storage

EUDIPLO can be deployed as:

- a **standalone local service** (e.g., during development)
- a **backend service** in production (e.g., behind a gateway)

You can find examples of deployments in the
[deployment](https://github.com/openwallet-foundation-labs/eudiplo/tree/main/deployment)
directory.

For configuration management, see
[Configuration Import](./configuration-import.md) to learn how to bootstrap your
deployment with pre-configured credentials and workflows.

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
