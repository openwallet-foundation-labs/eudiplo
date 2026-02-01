# Docker Compose Deployments

This directory contains Docker Compose configurations for EUDIPLO with profile-based deployment options.

## Quick Start

```bash
# Copy the appropriate environment file
cp .env.minimal.example .env   # For minimal setup
# OR
cp .env.standard.example .env  # For standard setup with Postgres + MinIO
# OR
cp .env.full.example .env      # For full setup with Vault

# Edit .env with your configuration
nano .env

# Start services
docker compose up -d                      # Minimal (default)
docker compose --profile standard up -d   # Standard
docker compose --profile full up -d       # Full
```

## Deployment Profiles

| Profile      | Command                                | Components                 | Use Case                  |
| ------------ | -------------------------------------- | -------------------------- | ------------------------- |
| **Minimal**  | `docker compose up`                    | EUDIPLO only               | Local dev, quick testing  |
| **Standard** | `docker compose --profile standard up` | + PostgreSQL, MinIO        | Staging, small production |
| **Full**     | `docker compose --profile full up`     | + PostgreSQL, MinIO, Vault | Enterprise production     |

## Configuration Matrix

| Component          | Minimal          | Standard   | Full            |
| ------------------ | ---------------- | ---------- | --------------- |
| **Database**       | SQLite           | PostgreSQL | PostgreSQL      |
| **File Storage**   | Local filesystem | MinIO (S3) | MinIO (S3)      |
| **Key Management** | DB-backed        | DB-backed  | HashiCorp Vault |

## Environment Files

- `.env.minimal.example` - Configuration for minimal deployment
- `.env.standard.example` - Configuration for standard deployment
- `.env.full.example` - Configuration for full deployment

## Service Access

After deployment, access the services at:

| Service               | URL                                   |
| --------------------- | ------------------------------------- |
| **Backend API**       | http://localhost:3000                 |
| **Client Web UI**     | http://localhost:4200                 |
| **API Documentation** | http://localhost:3000/api-docs        |
| **MinIO Console**     | http://localhost:9001 (standard/full) |
| **Vault UI**          | http://localhost:8200 (full)          |

## Upgrading Between Profiles

### Minimal → Standard

1. Backup any SQLite data
2. Copy `.env.standard.example` to `.env`
3. Configure database credentials
4. Start with `docker compose --profile standard up -d`
5. Run database migrations (automatic on startup)

### Standard → Full

1. Stop services: `docker compose --profile standard down`
2. Update `.env` with Vault configuration:
   ```
   KM_TYPE=vault
   VAULT_ADDR=http://vault:8200
   VAULT_TOKEN=your-token
   ```
3. Start with `docker compose --profile full up -d`

## Production Considerations

⚠️ **Before deploying to production:**

1. **Change all default credentials** in `.env`
2. **Use strong secrets**: `openssl rand -base64 32`
3. **Configure proper Vault setup** (not dev mode)
4. **Set up TLS/HTTPS** via reverse proxy
5. **Configure backup strategies** for PostgreSQL and MinIO

For more details, see the [full documentation](https://openwallet-foundation-labs.github.io/eudiplo/latest/deployment/docker-compose/).
