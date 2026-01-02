# Copilot Instructions for EUDIPLO

## Project Architecture
- **Monorepo**: Contains multiple apps (backend, client, dcapi, verifier-app, webhook) and shared packages.
- **Backend**: [apps/backend](../apps/backend) — NestJS API server, main business logic, protocol abstraction.
- **Client**: [apps/client](../apps/client) — Angular web UI for managing credentials, keys, and sessions.
- **Other Apps**: [apps/dcapi](../apps/dcapi) (Cloudflare Worker demo), [apps/webhook](../apps/webhook) (webhook simulator), [apps/verifier-app](../apps/verifier-app) (Angular verifier demo).
- **Deployment**: [deployment/](../deployment) — Docker Compose configs for minimal/full setups. See [deployment/README.md](../deployment/README.md).
- **Monitoring**: [monitor/](../monitor) — Prometheus & Grafana stack for observability.

## Developer Workflows
- **Install dependencies**: `pnpm install` (root)
- **Build all**: `pnpm build`
- **Start backend**: `pnpm --filter @eudiplo/backend dev` or use Docker Compose
- **Start client**: `pnpm --filter @eudiplo/client start`
- **Run all via Docker Compose**: `docker compose up -d` (see [deployment/README.md](../deployment/README.md))
- **Testing**: Use `pnpm test` or framework-specific commands in each app
- **Generate API types**: `pnpm run gen:api` (from root)

## Patterns & Conventions
- **API Design**: RESTful, protocol-agnostic endpoints. See [apps/backend/src](../apps/backend/src).
- **Credential Configs**: JSON-based, managed via client UI and backend API.
- **Key Management**: Pluggable, supports filesystem and cloud KMS (see backend config).
- **Session Management**: Real-time updates via polling in client.
- **Environment Variables**: Each app has its own `.env` or `example.env`.
- **Testing**: Use framework-native tools (Jest for backend, Angular CLI for client).
- **Docs**: Main docs in [docs/](../docs), API docs via Compodoc.

## Integration & External Dependencies
- **OID4VCI, OID4VP, SD-JWT VC**: Protocol support in backend.
- **Cloudflare Workers**: Used in [apps/dcapi](../apps/dcapi) and [apps/webhook](../apps/webhook).
- **Prometheus/Grafana**: Monitoring via [monitor/](../monitor).

## Examples
- **Minimal local run**: `docker compose up -d` (from root)
- **Dev backend only**: `pnpm --filter @eudiplo/backend dev`
- **Dev client only**: `pnpm --filter @eudiplo/client start`
- **Monitor stack**: `cd monitor && docker-compose up -d`

## Key Files & Directories
- [apps/backend/](../apps/backend) — API, business logic, protocols
- [apps/client/](../apps/client) — Angular UI
- [deployment/](../deployment) — Docker configs
- [monitor/](../monitor) — Monitoring stack
- [docs/](../docs) — Documentation

---
For more, see [README.md](../README.md) and app-specific READMEs.
