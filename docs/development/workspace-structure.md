# Workspace Structure

EUDIPLO is organized as a **monorepo workspace** using pnpm workspaces. This structure allows us to manage multiple related applications in a single repository while maintaining clear separation of concerns.

## 📁 Directory Structure

```
eudiplo/
├── apps/                          # Application packages
│   ├── backend/                   # NestJS API server
│   │   ├── src/                   # Backend source code
│   │   ├── test/                  # Backend tests
│   │   ├── package.json           # Backend dependencies
│   │   └── Dockerfile            # Backend container definition
│   ├── client/                    # Angular web interface
│   │   ├── src/                   # Client source code
│   │   ├── package.json           # Client dependencies
│   │   └── Dockerfile            # Client container definition
│   └── webhook/                   # Cloudflare Worker for testing
│       ├── src/                   # Webhook source code
│       └── package.json           # Webhook dependencies
├── assets/                        # Configuration and assets
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

# Start all applications
pnpm run dev

# Start specific application
pnpm --filter @eudiplo/backend run start:dev
pnpm --filter @eudiplo/client run dev
pnpm --filter test-rp run dev
```

### Building

```bash
# Build all applications
pnpm run build

# Build specific application
pnpm --filter @eudiplo/backend run build
pnpm --filter @eudiplo/client run build
```

### Testing

```bash
# Test all applications
pnpm run test

# Test specific application
pnpm --filter @eudiplo/backend run test
pnpm --filter @eudiplo/client run test
```

### Linting & Formatting

```bash
# Check code quality across workspace
pnpm run lint
pnpm run format:check

# Fix issues automatically
pnpm run lint:fix
pnpm run format
```

## 🐳 Docker Integration

Each application has its own optimized Dockerfile:

- **Backend**: `apps/backend/Dockerfile` - Multi-stage build with workspace support
- **Client**: `apps/client/Dockerfile` - Angular build with nginx serving

The root `docker-compose.yml` orchestrates both services:

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

1. **Code Sharing**: Common utilities and types can be shared between applications
2. **Unified Tooling**: Single configuration for linting, formatting, and testing
3. **Atomic Changes**: Related changes across applications can be made in single commits
4. **Efficient CI/CD**: Build and test processes can be optimized for the entire workspace
5. **Developer Experience**: Single repository clone with all related code
