# Installation

EUDIPLO is distributed as a Docker image and can be installed quickly by
configuring an `.env` file and running the container. This section guides you
through the steps to get started.

---

## Requirements

- [Docker](https://www.docker.com/get-started) installed on your system
- A `.env` file with the necessary configuration
- Mounted `config/` folder for local database or credential config

---

## 1. Prepare Environment Variables

Create a `.env` file with the following minimal configuration:

```env
PROXY=https://example.com
```

> 💡 For advanced configuration options (e.g., ports, folders, key storage,
> token endpoints), check out the [Configuration Guide](configuration.md).

---

## 2. Run the Docker Container

```bash
docker run --env-file .env -v $(pwd)/config:/app/config ghcr.io/cre8/eudiplo:latest
```

---

## 3. Verify It's Running

Once started, EUDIPLO exposes several endpoints. For example:

```bash
curl http://localhost:3000/health
```

Or explore the interactive API docs via:

- [http://localhost:3000/api](http://localhost:3000/api)

---

## Using PostgreSQL Instead of SQLite

If you want to use PostgreSQL for storing session data, set the following in
your `.env`:

```env
DB_TYPE=postgres
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=youruser
DB_PASSWORD=yourpassword
DB_DATABASE=EUDIPLO
```

And add this to your `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: youruser
      POSTGRES_PASSWORD: yourpassword
      POSTGRES_DB: EUDIPLO
    ports:
      - 5432:5432
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## Next Steps

- Configure credential templates in the `config/` folder
- Use the API to issue and verify credentials
- Explore advanced setup with PostgreSQL or Vault

Check the [Configuration Guide](configuration.md) for a full list of options.
