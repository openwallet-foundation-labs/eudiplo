# Kubernetes Deployment

📚 **Full documentation can be found here:**

**[https://openwallet-foundation-labs.github.io/eudiplo/latest/deployment/kubernetes/](https://openwallet-foundation-labs.github.io/eudiplo/latest/deployment/kubernetes/)**

The comprehensive Kubernetes deployment guide includes:

- ✅ Prerequisites and setup instructions
- ✅ Step-by-step deployment guide
- ✅ Access methods (Ingress and port-forwarding)
- ✅ Testing and verification procedures
- ✅ Comprehensive troubleshooting
- ✅ Production considerations
- ✅ Advanced configuration options

## Quick Reference

This directory contains Kubernetes manifests for deploying EUDIPLO with PostgreSQL and MinIO.

### Quick Start

```bash
# 1. Enable Kubernetes in Docker Desktop
# 2. Install ingress-nginx (see docs above)

# 3. Configure and deploy
cd deployment/k8s
cp .env.example .env
# Edit .env with your values

kubectl create namespace eudiplo
kubectl -n eudiplo create secret generic eudiplo-env --from-env-file=.env
kubectl apply -k .

# 4. Verify
kubectl -n eudiplo get pods -w
```

### Access

- **Backend API:** <http://eudiplo.localtest.me/api>i>
- **Client UI:** <http://eudiplo-client.localtest.me/>/>
- **MinIO Console:** <http://minio-console.localtest.me/>/>

### Manifest Files

| File                             | Purpose                 |
| -------------------------------- | ----------------------- |
| `namespace.yaml`                 | Namespace definition    |
| `postgres-statefulset.yaml`      | PostgreSQL database     |
| `postgres-service.yaml`          | Database service        |
| `minio-statefulset.yaml`         | MinIO object storage    |
| `minio-service.yaml`             | MinIO service           |
| `minio-bucket-job.yaml`          | Bucket creation job     |
| `eudiplo-deployment.yaml`        | Backend deployment      |
| `eudiplo-service.yaml`           | Backend service         |
| `eudiplo-client-deployment.yaml` | Web client deployment   |
| `eudiplo-client-service.yaml`    | Client service          |
| `ingress.yaml`                   | Ingress routing         |
| `kustomization.yaml`             | Kustomize configuration |

## Support

For detailed instructions, troubleshooting, and production guidance:

👉 **[Read the full documentation](https://openwallet-foundation-labs.github.io/eudiplo/latest/deployment/kubernetes/)**
