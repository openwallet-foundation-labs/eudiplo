# Databases

This service uses [TypeORM](https://typeorm.io/) for data persistence. By
default, a local **SQLite** database is used, but the system is designed to
support additional databases like **PostgreSQL** via dynamic configuration.
Other database engines (e.g. MySQL) can be added easily thanks to TypeORM’s
flexible architecture.

## Default: SQLite

When no other database type is specified, the service will store data in a local
SQLite file. The location of the database file is determined by the `FOLDER`
environment variable. The SQLite database will be created as `service.db` inside
that folder.

## PostgreSQL Support

PostgreSQL can be used by setting the following environment variables:

```env
DB_TYPE=postgres
DB_HOST=your-postgres-host
DB_PORT=5432
DB_USERNAME=your-db-username
DB_PASSWORD=your-db-password
DB_DATABASE=your-db-name
```
