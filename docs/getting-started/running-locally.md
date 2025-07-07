# Running Locally

This guide will help you run the project locally for development or testing
purposes.

## Prerequisites

Before you start, make sure you have the following tools installed:

- [Node.js](https://nodejs.org/) (version 20+ recommended)
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/)
- [Git](https://git-scm.com/)

## 1. Clone the Repository

```bash
git clone https://github.com/cre8/eudiplo
cd EUDIPLO
```

## 2. Install Dependencies

```bash
pnpm install
```

## 3. Set Up Environment Variables

Create a `.env` file in the root of the project:

```bash
cp .env.example .env
```

Then update the values in `.env` according to your setup. For example:

```env
# SQLite setup
KM_TYPE=file
FOLDER=./config

# or PostgreSQL
DB_TYPE=postgres
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=mydb
```

> 💡 The project validates your environment variables on startup using Joi.

## 4. Start the Application

### With Docker Compose

If you're using Docker Compose to run the full stack (e.g., Vault, PostgreSQL,
etc.), you can start everything with:

```bash
docker-compose up --build
```

This will:

- Build the NestJS application
- Start required services
- Mount necessary volumes (e.g., keys/config)

Make sure the `docker-compose.yml` includes relevant services and waits for
dependencies to become healthy before starting the app.

## 5. Access the Service

Once running, the application is typically accessible at:

```3000
http://localhost:3000
```

You should see the default health endpoint or API response depending on your
setup.

---

## 6. Troubleshooting

- Double-check `.env` values for typos or missing values.
- Ensure Docker services are healthy and have finished starting.
- Clear Node/Nest cache with `rm -rf dist node_modules && pnpm install`.
- Use `docker-compose logs -f` to inspect logs if something fails.

---

## Next Steps

- See [Configuration](configuration.md) for all environment variable options.
- See [Key Management](../architecture/key-management.md) to configure signing
  keys.
- See [Database](../architecture/database.md) to switch database engines.
