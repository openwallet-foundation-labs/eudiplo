# EUDIPLO + PostgreSQL + MinIO on Kubernetes (Docker Desktop)

This adds **PostgreSQL** and **MinIO** (S3-compatible) with persistent storage, and wires the backend to both.

## .env keys required (Secret: `eudiplo-env`)

```
# Postgres
DB_USERNAME=...
DB_PASSWORD=...
DB_DATABASE=...

# MinIO root creds + bucket for bootstrap Job
MINIO_ROOT_USER=...
MINIO_ROOT_PASSWORD=...
MINIO_BUCKET=uploads

# (Optional) If your app expects these:
# S3_ACCESS_KEY_ID=...
# S3_SECRET_ACCESS_KEY=...
# S3_BUCKET=uploads
# S3_REGION=us-east-1
# S3_SSL=false
```

Backend defaults (can be overridden by `.env`):

- `DB_HOST=postgres`, `DB_PORT=5432`
- `S3_ENDPOINT=http://minio:9000`

## Apply

```bash
kubectl create namespace eudiplo
kubectl -n eudiplo create secret generic eudiplo-env --from-env-file=.env
kubectl apply -k .
kubectl -n eudiplo get pods,svc,ingress
```

## Local access

- **Port-forward (quick):**

  ```bash
  kubectl -n eudiplo port-forward svc/eudiplo 3000:3000
  kubectl -n eudiplo port-forward svc/eudiplo-client 4200:80
  kubectl -n eudiplo port-forward svc/minio 9001:9001   # Console
  ```

- **Ingress (with ingress-nginx):**
  - <http://eudiplo.localtest.me/health>
  - <http://eudiplo-client.localtest.me/>
  - <http://minio-console.localtest.me/>

## Notes

- PVCs use the cluster's default StorageClass (Docker Desktop normally has one).
- The bucket Job is idempotent; it will succeed even if the bucket already exists.
- If you prefer NodePort or TLS, tweak the Services/Ingress; I can supply variants on request.
