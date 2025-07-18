# Running Locally

This guide will help you run the project locally for development or testing
purposes. It is intended for developers who want to inspect or modify the code
and run the service directly using Node.js.

## Prerequisites

Before you start, make sure you have the following tools installed:

- [Node.js](https://nodejs.org/) (version 20+ recommended)
- [pnpm](https://pnpm.io/)
- [Git](https://git-scm.com/)
- [ngrok](https://ngrok.com/) (optional, for exposing a public URL)
- [Docker](https://www.docker.com/) (optional, only for supporting services like
  PostgreSQL or Vault)

## 1. Clone the Repository

```bash
git clone https://github.com/cre8/eudiplo
cd eudiplo
```

## 2. Install Dependencies

```bash
corepack enable
pnpm install
```

## 3. Set Up Environment Variables

Create a `.env` file in the root of the project:

```bash
cp .env.example .env
```

To allow the registrar and external services to interact with your running
application, a **public HTTPS URL** is required. You can use **ngrok** to expose
your local server:

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

## 4. Start the Application

Start the NestJS application in development mode using:

```bash
pnpm run start:dev
```

This will:

- Compile and watch your TypeScript code
- Reload on changes
- Use your `.env` configuration for keys, database, and registrar access

Make sure any external services (like PostgreSQL or Vault) are available, either
locally or through Docker.

> 🛠️ You do **not** need to use Docker to run the application itself — this
> guide assumes you're running it via Node.js for local development.

## 5. Access the Service

Once running, the application is typically accessible at:

```
http://localhost:3000
```

Or via the public URL configured with ngrok, for example:

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
