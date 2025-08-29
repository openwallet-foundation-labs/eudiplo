# EUDIPLO on Kubernetes (no volume mounts)

This setup runs your `eudiplo` and `eudiplo-client` without mounting any config/assets.

## Quick start

```bash
# Namespace
kubectl create namespace eudiplo

# Load your .env as a Secret (compose used env_file: .env)
kubectl -n eudiplo create secret generic eudiplo-env --from-env-file=.env

# Apply everything
kubectl apply -k .
```

## What you get

- **eudiplo** Deployment + Service on port 3000 with HTTP probes on `/health`.
- **eudiplo-client** Deployment + Service on port 80 with probes on `/`.
- Client waits for backend via an initContainer (compose `depends_on: service_healthy` equivalent).
- **Ingress** routing:
  - `eudiplo.localtest.me` → backend (3000)
  - `eudiplo-client.localtest.me` → client (80)

Adjust Ingress hosts/TLS to your environment.
