# Deployments

This directory contains deployment configurations for EUDIPLO.

**📖 For comprehensive deployment documentation, visit:**  
**[https://openwallet-foundation-labs.github.io/eudiplo/latest/deployment/](https://openwallet-foundation-labs.github.io/eudiplo/latest/deployment/)**

## Quick Reference

| Deployment      | Path                    | Documentation                                                                                                                             | Use Case      |
| --------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **Quick Start** | `../docker-compose.yml` | [Docker Compose Guide](https://openwallet-foundation-labs.github.io/eudiplo/latest/deployment/docker-compose/)                            | Quick testing |
| **Minimal**     | `minimal/`              | [Docker Compose Guide](https://openwallet-foundation-labs.github.io/eudiplo/latest/deployment/docker-compose/#minimal-deployment)         | Development   |
| **Full**        | `full/`                 | [Docker Compose Guide](https://openwallet-foundation-labs.github.io/eudiplo/latest/deployment/docker-compose/#full-deployment-production) | Production    |
| **Kubernetes**  | `k8s/`                  | [Kubernetes Guide](https://openwallet-foundation-labs.github.io/eudiplo/latest/deployment/kubernetes/)                                    | Production    |

## Quick Start Commands

### Docker Compose (Root)

```bash
# From repository root
docker compose up -d

# Access
# Backend: http://localhost:3000
# Client:  http://localhost:4200
```

### Minimal Deployment

```bash
cd deployment/minimal
cp example.env .env
docker compose up -d
```

### Full Deployment

```bash
cd deployment/full
cp example.env .env
# Edit .env with your configuration
docker compose up -d
```

### Kubernetes

```bash
cd deployment/k8s
cp .env.example .env
# Edit .env with your configuration
kubectl apply -f .
```

## Components

EUDIPLO consists of:

- **Backend** (`eudiplo`) - NestJS API server (port 3000)
- **Client** (`eudiplo-client`) - Angular web interface (port 4200/80)

Full deployment includes:

- **PostgreSQL** - Database (port 5432)
- **HashiCorp Vault** - Key management (port 8200)
- **MinIO** - Object storage (ports 9000, 9001)

## Environment Configuration

Each deployment includes an `example.env` file. Copy and customize:

```bash
cp example.env .env
# Edit .env with your configuration
```

## Support

- **Documentation:** [https://openwallet-foundation-labs.github.io/eudiplo/latest/](https://openwallet-foundation-labs.github.io/eudiplo/latest/)
- **Issues:** [GitHub Issues](https://github.com/openwallet-foundation-labs/eudiplo/issues)
- **Community:** [Discord](https://discord.gg/58ys8XfXDu)

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
