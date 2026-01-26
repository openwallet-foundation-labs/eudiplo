# Contributing to EUDIPLO

Thanks for your interest in contributing to **EUDIPLO** – your help is highly appreciated! 🎉

This guide will walk you through the steps to report issues, suggest features, and contribute code or documentation.

---

## Reporting Issues

If you find a bug, glitch, or unclear behavior:

1. **Search** existing [issues](https://github.com/openwallet-foundation-labs/eudiplo/issues) to avoid duplicates.
2. If not found, **open a new issue** and include:
   - A short description
   - Steps to reproduce
   - Your environment (OS, Docker version, etc.)
   - Logs or screenshots if possible

---

## Suggesting Enhancements

Have an idea to improve EUDIPLO?

- Check if a [feature request](https://github.com/openwallet-foundation-labs/eudiplo/issues) already exists
- Open a new issue with a `feature request` label and describe:
  - The problem you want to solve
  - The proposed solution
  - Alternatives considered (if any)

---

## Getting Started

### Option A: Local Development

1. **Fork the repo** and clone it locally:

   ```bash
   git clone https://github.com/your-username/eudiplo.git
   cd eudiplo
   ```

2. **Install dependencies** for the entire workspace:

   ```bash
   corepack enable
   pnpm install
   ```

3. **Set up your environment** for development:

   ```bash
   cp .env.example .env
   # Optional: Set up Python environment for documentation
   pnpm run setup
   ```

4. **Start the application(s)** you want to work on:

   ```bash
   # Start just the backend
   pnpm --filter @eudiplo/backend run start:dev

   # Start just the client
   pnpm --filter @eudiplo/client run dev

   # Or start both with Docker Compose
   docker compose up -d
   ```

### Option B: Dev Container (No Node.js Installation Required)

If you can't or don't want to install Node.js locally, use VS Code Dev Containers:

1. **Prerequisites**: Install [Docker](https://docs.docker.com/get-docker/) and [VS Code](https://code.visualstudio.com/) with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

2. **Clone and open in VS Code**:

   ```bash
   git clone https://github.com/your-username/eudiplo.git
   cd eudiplo
   code .
   ```

3. **Reopen in Container**: Press `F1` → "Dev Containers: Reopen in Container"

4. **Start development**: Dependencies install automatically, then run `pnpm dev`

See [.devcontainer/README.md](.devcontainer/README.md) for more details.

---

## Code Quality

This project uses [Biome](https://biomejs.dev/) for code formatting and linting:

```bash
# Format your code
pnpm run format

# Check for linting issues
pnpm run lint

# Fix linting issues automatically
pnpm run lint:fix
```

See [Code Quality Standards](docs/development/code-quality.md) for detailed guidelines.

---

## Pull Request Checklist

Before submitting:

- [ ] Code is tested and builds without errors
- [ ] Code formatting passes (`pnpm run format:check`)
- [ ] Linting passes (`pnpm run lint`)
- [ ] You've added/updated documentation as needed
- [ ] PR is focused on a single topic

Please **create your PR against the `main` branch**.

---

## Documentation Contributions

Documentation is in the `docs/` folder and uses [MkDocs](https://www.mkdocs.org/). To work with documentation:

```bash
# Set up Python environment for documentation (one-time setup)
pnpm run setup:python

# Build documentation
pnpm run doc:build

# Serve documentation with live reload
pnpm run doc:watch
```

The documentation includes:

- User guides in `docs/getting-started/`
- Developer guides in `docs/development/`
- API documentation generated from code
- Architecture documentation

---

## Community & Conduct

We follow a [Code of Conduct](CODE_OF_CONDUCT.md) to foster an inclusive and respectful environment. Please be kind and constructive.

---

## Need Help?

- Open a discussion or issue on [GitHub](https://github.com/openwallet-foundation-labs/eudiplo/issues)
- Contact the maintainers for guidance

Thanks for helping improve EUDIPLO!
