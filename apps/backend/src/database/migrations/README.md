# TypeORM Migrations

This directory contains TypeORM database migrations for the EUDIPLO backend.

## Migration Commands

Run these commands from the `apps/backend` directory:

```bash
# Generate a new migration based on entity changes
pnpm migration:generate --name=MigrationName

# Create an empty migration
pnpm migration:create --name=MigrationName

# Run pending migrations
pnpm migration:run

# Revert the last migration
pnpm migration:revert

# Show migration status
pnpm migration:show
```

## Important Notes

1. **Production Safety**: The `synchronize` option is now disabled by default. Use migrations for schema changes in production.

2. **For Existing Databases**: If you're upgrading from a version that used `synchronize: true`, your database schema should already match the entities. The initial migration will be skipped automatically if the tables already exist.

3. **For New Installations**: Migrations will run automatically on startup (unless `DB_MIGRATIONS_RUN=false`).

4. **Development Mode**: You can enable `DB_SYNCHRONIZE=true` for development to auto-sync schema changes, but this is not recommended for production.
