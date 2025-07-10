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

Create a `.env` file with the following minimal configuration:

```env
PUBLIC_URL=https://example.com
AUTH_API_KEY=a_very_secure_api_key
```

The public URL is the base URL where EUDIPLO will be accessible, and the API key
is used for [authentication](./management.md#authentication).

---

## 2. Run the Docker Container

You can run EUDIPLO using Docker Compose. Create a `docker-compose.yml` file in
the root of your project with the following content:

```yaml
services:
    EUDIPLO:
        image: ghcr.io/cre8/eudiplo:latest
        env_file:
            - .env
        ports:
            - '3000:3000'
        volumes:
            - ./config:/app/config
```

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

---

## Next Steps

- Configure [issuance templates](issuance.md) for your credentials
- Set up [presentations](presentation.md) for verifying credentials
- Explore advanced setup with other
  [database options](../architecture/database.md) or
  [key management](../architecture/key-management.md)
