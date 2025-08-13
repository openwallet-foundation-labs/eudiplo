# Running Locally

This guide will help you run the project locally for development or testing purposes. 

EUDIPLO is now organized as a **monorepo workspace** containing:
- **Backend** (`apps/backend/`) - NestJS API server
- **Client** (`apps/client/`) - Angular web interface  
- **Webhook** (`apps/webhook/`) - Cloudflare Worker for testing

## Prerequisites

Before you start, make sure you have the following tools installed:

- [Node.js](https://nodejs.org/) (version 22+ recommended)
- [pnpm](https://pnpm.io/) (package manager for monorepo workspaces)
- [Git](https://git-scm.com/)
- [ngrok](https://ngrok.com/) (optional, for exposing a public URL)
- [Docker](https://www.docker.com/) (optional, for supporting services or containerized deployment)

## 1. Clone the Repository

```bash
git clone https://github.com/openwallet-foundation-labs/eudiplo
cd eudiplo
```

## 2. Install Dependencies

Install all workspace dependencies:

```bash
corepack enable
pnpm install
```

This will install dependencies for all applications in the workspace.

## 3. Set Up Environment Variables

Create a `.env` file in the root of the project:

```bash
cp .env.example .env
```

Configure Python environment for documentation (optional):

```bash
pnpm run setup:python
```

To allow your wallet to interact with your service, a **public HTTPS URL** is
required. You can use **ngrok** to expose your local server:

> TODO: check if it also runs in a local network when using wallets.

```bash
ngrok http 3000
```

ngrok will display a public HTTPS URL like:

```text
https://f8e3-84-123-45-67.ngrok.io
```

Use this value in your `.env`:

```env
PUBLIC_URL=https://f8e3-84-123-45-67.ngrok.io
```

> 💡 The project validates your environment variables on startup using Joi. If
> `PUBLIC_URL` is missing or invalid, the app may fail to register with external
> services.

Check out the [Key Management](../architecture/key-management.md) or
[Database](../architecture/database.md) sections for more information on how to
configure key storage and database options beyond the default settings.

## 4. Start the Applications

### Option A: Start All Services with Docker Compose

```bash
# Start both backend and client
docker compose up -d

# View logs
docker compose logs -f
```

### Option B: Start Individual Applications

**Start the Backend (NestJS API):**

```bash
pnpm --filter @eudiplo/backend run start:dev
```

**Start the Client (Angular UI) - in another terminal:**

```bash
pnpm --filter @eudiplo/client run dev
```

**Start the Webhook (for testing) - in another terminal:**

```bash
pnpm --filter test-rp run dev
```

### Option C: Start All Applications Locally

```bash
# Start all applications in development mode
pnpm run dev
```

This will:
- Compile and watch your TypeScript code
- Reload on changes
- Use your `.env` configuration for keys, database, and registrar access

Make sure any external services (like PostgreSQL or Vault) are available, either locally or through Docker.

## 5. Access the Services

Once running, the applications are accessible at:

**Backend API:**
```
http://localhost:3000
```

**Client Web Interface:**
```
http://localhost:4200
```

**Or via the public URL configured with ngrok:**
```
https://f8e3-84-123-45-67.ngrok.io
```

---

## 6. Troubleshooting

- Double-check `.env` values for typos or missing entries. Changes in the `.env`
  file require a restart of the application.
- Ensure required external services (e.g. Vault, PostgreSQL) are running.
- Clear NestJS cache with `rm -rf dist node_modules && pnpm install`.
- If ngrok fails, make sure port 3000 isn't blocked or already in use.

---

## Next Steps

- See [Key Management](../architecture/key-management.md) to configure signing
  keys.
- See [Database](../architecture/database.md) to switch database engines.
