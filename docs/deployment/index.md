# Deployment Options

EUDIPLO can be deployed in various ways depending on your needs, from local development to production Kubernetes clusters.

## Quick Comparison

| Method               | Best For                 | Complexity      | Production Ready |
| -------------------- | ------------------------ | --------------- | ---------------- |
| **Docker Compose**   | Local development, demos | ⭐ Easy         | ❌ No            |
| **Kubernetes**       | Production, scalability  | ⭐⭐⭐ Advanced | ✅ Yes           |
| **Single Container** | Quick testing            | ⭐ Very Easy    | ❌ No            |

## Deployment Methods

### Docker Compose

The fastest way to get EUDIPLO running locally with all dependencies (PostgreSQL, MinIO).

Perfect for:

- 👨‍💻 Local development
- 🎯 Feature testing
- 📺 Demos and presentations

See: [Quick Start Guide](../getting-started/quick-start.md)

### Kubernetes

Production-ready deployment with high availability, auto-scaling, and monitoring.

Perfect for:

- 🏢 Production environments
- ☁️ Cloud deployments (AWS, Azure, GCP)
- 📈 Scalable applications
- 🔄 High availability requirements

See: [Kubernetes Deployment Guide](kubernetes.md)

### Single Container (Docker)

Minimal setup for quick testing without dependencies.

Perfect for:

- ⚡ Quick API testing
- 🧪 CI/CD pipelines
- 📦 Embedded use cases

```bash
docker run -d \
  --name eudiplo \
  -p 3000:3000 \
  ghcr.io/openwallet-foundation-labs/eudiplo:latest
```

!!! warning "External Dependencies Required"
Single container mode requires external PostgreSQL and S3-compatible storage (MinIO/AWS S3) configured via environment variables.

## TLS/HTTPS Configuration

EUDIPLO supports built-in TLS termination for serving HTTPS directly without a reverse proxy. This is useful for simple deployments or development environments.

See: [TLS Configuration Guide](tls.md)

## Production Checklist

Before deploying to production, ensure you:

- [ ] Changed all default credentials (JWT_SECRET, database passwords)
- [ ] Configured TLS/HTTPS with valid certificates
- [ ] Set up database backups
- [ ] Configured monitoring and alerting
- [ ] Reviewed resource limits and scaling policies
- [ ] Set up log aggregation
- [ ] Configured network policies and firewalls
- [ ] Implemented secret management (e.g., HashiCorp Vault, AWS Secrets Manager)
- [ ] Reviewed [Architecture documentation](../architecture/index.md)

## Next Steps

- **New to EUDIPLO?** Start with [Quick Start](../getting-started/quick-start.md)
- **Ready for K8s?** See [Kubernetes Deployment](kubernetes.md)
- **Need help?** Visit our [GitHub Issues](https://github.com/openwallet-foundation-labs/eudiplo/issues)
