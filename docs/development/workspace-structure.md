```
├── docs/                          # Documentation
├── deployment/                    # Docker Compose configurations
├── package.json                   # Root workspace configuration
├── pnpm-workspace.yaml           # pnpm workspace definition
└── docker-compose.yml            # Development compose file
```

## 🏗️ Applications

### Backend (`@eudiplo/backend`)

- **Technology**: NestJS with TypeScript
- **Purpose**: Core API server for EUDI Wallet integration
- **Port**: 3000
- **Key Features**:
    - OID4VCI, OID4VP, SD-JWT VC support
    - OAuth2 authentication
    - Pluggable key management
    - Database abstraction

### Client (`@eudiplo/client`)

- **Technology**: Angular with TypeScript
- **Purpose**: Web interface for EUDIPLO management
- **Port**: 4200
- **Key Features**:
    - Credential issuance configuration
    - Presentation request management
    - Real-time monitoring
    - Admin dashboard

### Webhook (`test-rp`)

- **Technology**: Cloudflare Worker
- **Purpose**: Testing relying party implementation
- **Key Features**:
    - Webhook endpoints for testing
    - Presentation verification
    - Development utilities

## 🔧 Workspace Commands

The workspace provides several convenient commands:

### Development

```bash
# Install all dependencies
pnpm install
```

## 🏗️ Applications & Domains

### Backend (`@eudiplo/backend`)

- **Technology**: NestJS with TypeScript
- **Purpose**: Core API server for EUDI Wallet integration
- **Port**: 3000
- **Structure**: Domain-driven, modular
    - **core/**: Platform infrastructure (health, metrics, app info)
    - **shared/**: Utilities, guards, filters, helpers
    - **issuer/**: Credential Issuer (configuration, issuance, lifecycle)
    - **verifier/**: Presentation Verifier (presentation, offer, OID4VP)
    - **registrar/**: Entity onboarding and registry
    - **auth/**, **crypto/**, **database/**, **session/**, **storage/**: Infrastructure modules

### Client (`@eudiplo/client`)

- **Technology**: Angular with TypeScript
- **Purpose**: Web interface for EUDIPLO management
- **Port**: 4200
- **Features**: Credential config, presentation management, monitoring, admin dashboard

### Webhook (`@eudiplo/webhook`)

- **Technology**: Cloudflare Worker
- **Purpose**: Testing relying party implementation
- **Features**: Webhook endpoints, presentation verification

### SDK (`@eudiplo/eudiplo-sdk`)

- **Technology**: TypeScript
- **Purpose**: Programmatic access to EUDIPLO APIs

### Other Packages

- **schemas/**: JSON Schemas for API/data validation
- **assets/**: Static configuration, root trust lists, uploads
- **monitor/**: Prometheus/Grafana monitoring setup

```bash
# Check code quality across workspace
pnpm run lint
pnpm run format:check

# Fix issues automatically
pnpm run lint:fix
pnpm run format
```

## 🐳 Docker & Deployment

Each application has its own optimized Dockerfile:

- **Backend**: `apps/backend/Dockerfile` (multi-stage build)
- **Client**: `apps/client/Dockerfile` (Angular build, nginx serving)
- **Webhook**: `apps/webhook/Dockerfile` (Cloudflare Worker)

The root `docker-compose.yml` orchestrates all main services:

```bash
# Start both services
docker compose up -d

# Build and start
docker compose up -d --build

# View logs
docker compose logs -f
```

## 📦 Dependency Management

The workspace uses **pnpm** for efficient dependency management:

- **Shared dependencies** are hoisted to the root `node_modules`
- **App-specific dependencies** remain in their respective `node_modules`
- **Lockfile** (`pnpm-lock.yaml`) ensures consistent installs across environments

### Adding Dependencies

```bash
# Add to workspace root (shared utilities)
pnpm add dependency-name

# Add to specific application
pnpm --filter @eudiplo/backend add dependency-name
pnpm --filter @eudiplo/client add dependency-name
```

## 🚀 Benefits

This workspace structure provides:

1. **Domain-driven clarity**: Business logic, infrastructure, and cross-cutting concerns are clearly separated
2. **Code Sharing**: Common utilities and types can be shared between applications
3. **Unified Tooling**: Single configuration for linting, formatting, and testing
4. **Atomic Changes**: Related changes across applications can be made in single commits
5. **Efficient CI/CD**: Build and test processes can be optimized for the entire workspace
6. **Developer Experience**: Single repository clone with all related code
