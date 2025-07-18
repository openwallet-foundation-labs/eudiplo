# Installation

EUDIPLO is distributed as a Docker image and can be installed quickly by
configuring an `.env` file and running the container. This section guides you
through the steps to get started.

---

## Requirements

- [Docker](https://www.docker.com/get-started) installed on your system
- A `.env` file with the necessary configuration
- Mounted `config/` folder for local database or credential config

---

## 1. Prepare Environment Variables

EUDIPLO uses **OAuth2 Client Credentials flow with Bearer JWT tokens** for API
authentication. All endpoints follow the pattern `/{tenantId}/...` for tenant
isolation.

You can choose how to manage OAuth2 clients:

### Self-Managed Clients (Default)

**EUDIPLO manages clients and issues JWT tokens:**

```env
PUBLIC_URL=https://example.com
RP_NAME=EUDIPLO
AUTH_CLIENT_ID=your-tenant-id
AUTH_CLIENT_SECRET=your-tenant-secret
JWT_SECRET=your-jwt-signing-secret
JWT_ISSUER=https://example.com
JWT_EXPIRES_IN=1h
```

### External OIDC Provider

**External IAM (e.g., Keycloak) manages clients and tokens:**

```env
PUBLIC_URL=https://example.com
RP_NAME=EUDIPLO
OIDC=https://keycloak.example.com/realms/eudiplo
```

> TODO: needs to be aligned

---

## 2. Run the Docker Container

You can run EUDIPLO using Docker Compose. We recommend to use the latest stable
version available on
[GitHub Container Registry](https://github.com/cre8/eudiplo/pkgs/container/eudiplo).
Create a `docker-compose.yml` file in the root of your project with the
following content:

```yaml
services:
    EUDIPLO:
        image: ghcr.io/cre8/eudiplo:1
        env_file:
            - .env
        ports:
            - '3000:3000'
        volumes:
            - ./config:/app/config
```

> Tip: the tag `:latest` is used for build based on the `main` branch that may
> not be aligned with a stable release or the hosted documentation.

---

## 3. Verify It's Running

Once started, EUDIPLO exposes several endpoints. For example:

```bash
curl https://example.com/health
```

The swagger UI is available at:

```bash
https://example.com/api
```

### API Endpoint Pattern

All tenant-specific endpoints follow the pattern:

```bash
https://example.com/{tenantId}/vci/credential
https://example.com/{tenantId}/.well-known/openid-credential-issuer
https://example.com/{tenantId}/oid4vp/response
```

Where `{tenantId}` corresponds to your OAuth2 client ID.

All admin endpoints like managing configs of flows or starting issuance flows
are protected and accessible via the same path.

---

## Next Steps

- Configure [issuance templates](issuance.md) for your credentials
- Set up [presentations](presentation.md) for verifying credentials
- Explore advanced setup with other
  [database options](../architecture/database.md) or
  [key management](../architecture/key-management.md)
