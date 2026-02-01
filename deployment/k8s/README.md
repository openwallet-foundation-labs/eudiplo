# Kubernetes Deployments

This directory contains Kubernetes manifests for EUDIPLO using Kustomize for flexible, composable deployments.

📚 **Full documentation:** [https://openwallet-foundation-labs.github.io/eudiplo/latest/deployment/kubernetes/](https://openwallet-foundation-labs.github.io/eudiplo/latest/deployment/kubernetes/)

## Directory Structure

```
k8s/
├── base/                    # Core EUDIPLO manifests
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── eudiplo-deployment.yaml
│   ├── eudiplo-service.yaml
│   ├── eudiplo-client-deployment.yaml
│   ├── eudiplo-client-service.yaml
│   └── ingress.yaml
│
├── components/              # Optional infrastructure components
│   ├── postgres/           # PostgreSQL database
│   ├── minio/              # MinIO S3-compatible storage
│   └── vault/              # HashiCorp Vault key management
│
└── overlays/               # Pre-configured deployment profiles
    ├── minimal/            # EUDIPLO only (SQLite, local storage)
    ├── standard/           # + PostgreSQL + MinIO
    └── full/               # + PostgreSQL + MinIO + Vault
```

## Quick Start

### 1. Choose Your Overlay

| Overlay      | Command                              | Components                 | Use Case            |
| ------------ | ------------------------------------ | -------------------------- | ------------------- |
| **Minimal**  | `kubectl apply -k overlays/minimal`  | EUDIPLO only               | Local dev, testing  |
| **Standard** | `kubectl apply -k overlays/standard` | + PostgreSQL, MinIO        | Staging, small prod |
| **Full**     | `kubectl apply -k overlays/full`     | + PostgreSQL, MinIO, Vault | Enterprise prod     |

### 2. Configure and Deploy

```bash
# Navigate to the k8s directory
cd deployment/k8s

# Choose your overlay and copy the example env
cp overlays/standard/.env.example overlays/standard/.env
# Edit with your configuration
nano overlays/standard/.env

# Create namespace and secret
kubectl create namespace eudiplo
kubectl -n eudiplo create secret generic eudiplo-env --from-env-file=overlays/standard/.env

# Deploy using Kustomize
kubectl apply -k overlays/standard

# Watch the deployment
kubectl -n eudiplo get pods -w
```

### 3. Access Services

- **Backend API:** http://eudiplo.localtest.me
- **Client UI:** http://eudiplo-client.localtest.me
- **MinIO Console:** http://minio-console.localtest.me (standard/full)

## Configuration Matrix

| Component          | Minimal   | Standard   | Full       |
| ------------------ | --------- | ---------- | ---------- |
| **Database**       | SQLite    | PostgreSQL | PostgreSQL |
| **File Storage**   | Local     | MinIO (S3) | MinIO (S3) |
| **Key Management** | DB-backed | DB-backed  | Vault      |

## Customizing Deployments

### Mix-and-Match Components

Create a custom overlay by combining components:

```yaml
# k8s/overlays/custom/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

namespace: eudiplo

components:
  - ../../components/postgres
  # Only include what you need
  # - ../../components/minio
  # - ../../components/vault
```

### Override Values

Add patches in your overlay to customize resources:

```yaml
# k8s/overlays/custom/kustomization.yaml
patches:
  - target:
      kind: Deployment
      name: eudiplo
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 3
```

## Legacy Manifests

The flat manifest files in this directory are kept for backwards compatibility.
New deployments should use the overlay system described above.

| File                        | Purpose              |
| --------------------------- | -------------------- |
| `namespace.yaml`            | Namespace definition |
| `postgres-statefulset.yaml` | PostgreSQL database  |
| `minio-statefulset.yaml`    | MinIO object storage |
| `eudiplo-deployment.yaml`   | Backend deployment   |
| `ingress.yaml`              | Ingress routing      |

## Troubleshooting

```bash
# Check pod status
kubectl -n eudiplo get pods
kubectl -n eudiplo describe pod <pod-name>
kubectl -n eudiplo logs <pod-name>

# Port forward for testing
kubectl -n eudiplo port-forward svc/eudiplo 3000:3000
```

## Production Considerations

⚠️ **Before deploying to production:**

1. **Change all default credentials**
2. **Use external managed services** (RDS, S3, Vault)
3. **Enable TLS** via cert-manager
4. **Configure resource limits**
5. **Set up monitoring** (Prometheus, Grafana)

👉 **[Read the full documentation](https://openwallet-foundation-labs.github.io/eudiplo/latest/deployment/kubernetes/)**
