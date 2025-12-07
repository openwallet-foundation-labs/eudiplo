# Deployments

This directory contains multiple deployment configurations for EUDIPLO.

EUDIPLO consists of two main services:

- **Backend** (`eudiplo`) - NestJS API server
- **Client** (`eudiplo-client`) - Angular web interface (optional)

Before running any of these deployments, make sure you have the necessary environment variables. You can find the required ones in the respective `example.env` files.

## Quick Start

To start both services with default settings:

```bash
# From the root directory
docker compose up -d
```

This will start:

- Backend API on port 3000
- Client UI on port 4200

## Deployment Options

### Minimal

```bash
cd deployment/minimal
docker compose up -d
```

Starting just the EUDIPLO services with minimal dependencies. This configuration:

- Uses SQLite for storage
- Manages keys in the filesystem
- Good for development and testing
- **Not recommended for production**

### Full

```bash
cd deployment/full  
docker compose up -d
```

This deployment includes:

- PostgreSQL database
- HashiCorp Vault for secure key management
- EUDIPLO Backend and Client services
- Proper production setup

⚠️ **Production Note**: Please check the documentation on how to run Vault in production. These resources may help:

- <https://github.com/ahmetkaftan/docker-vault>
- <https://gist.github.com/Mishco/b47b341f852c5934cf736870f0b5da81>

## Service Access

After deployment, access the services at:

- **Backend API**: <http://localhost:3000>
- **Client Web UI**: <http://localhost:4200> (if enabled)
- **API Documentation**: <http://localhost:3000/api-docs>
