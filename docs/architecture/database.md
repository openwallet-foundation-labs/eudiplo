# Databases

This service uses [TypeORM](https://typeorm.io/) for data persistence. By
default, a local **SQLite** database is used, but the system also supports
**PostgreSQL** and can be extended to work with other engines such as **MySQL**
thanks to TypeORM’s flexible architecture.

> 💡 Database configuration is fully dynamic and can be defined via environment
> variables.

---

## Configuration Overview

| Variable      | Description                                                   | Required for | Default  |
| ------------- | ------------------------------------------------------------- | ------------ | -------- |
| `DB_TYPE`     | Database engine (`sqlite` or `postgres`)                      | All          | `sqlite` |
| `FOLDER`      | Path for local SQLite database. Will be extended by tenant id | `sqlite`     | `./tmp`  |
| `DB_HOST`     | Hostname for PostgreSQL                                       | `postgres`   | –        |
| `DB_PORT`     | Port for PostgreSQL                                           | `postgres`   | –        |
| `DB_USERNAME` | PostgreSQL username                                           | `postgres`   | –        |
| `DB_PASSWORD` | PostgreSQL password                                           | `postgres`   | –        |
| `DB_DATABASE` | PostgreSQL database name                                      | `postgres`   | –        |

> ✅ If `DB_TYPE=sqlite`, only the `FOLDER` variable is needed. For `postgres`,
> all `DB_*` variables must be provided.

---

## SQLite (Default)

When using `DB_TYPE=sqlite`, the service will store its data in a local
file-based SQLite database located at the path defined by the `FOLDER` variable
(`./config` by default). This setup is lightweight and ideal for:

- Development
- Testing
- Prototyping

No additional database server is required.

---

## PostgreSQL

To connect to a PostgreSQL instance, set the following environment variables:

```env
DB_TYPE=postgres
DB_HOST=your-hostname
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_DATABASE=your-database
```

This mode is suitable for:

- Production deployments
- Multi-instance setups
- Scenarios requiring scalability and better concurrency handling

Make sure your database is reachable and properly initialized before starting
the service.

---

## Extensibility

Because this service uses TypeORM, it is easy to integrate additional database
engines such as:

- MySQL / MariaDB
- Microsoft SQL Server
- Oracle

To add support for a new engine:

- Install the appropriate TypeORM driver (e.g., `mysql2`)
- Set `DB_TYPE` to the corresponding engine name
- Configure the necessary connection options via environment variables

Let us know if you need help extending support for additional databases.

---

## Multi-Tenant Database Schema

EUDIPLO supports multi-tenancy, allowing multiple tenants to share the same
database while keeping their data isolated. This is achieved by adding a
`tenantId` column to relevant entities and filtering all queries by this
identifier.

### Tenant Isolation in Database

In multi-tenant mode, data isolation is achieved through a `tenantId` column in
all relevant entities:

#### Core Entities with Tenant Support:

**Session Entity:**

```typescript
@Entity()
export class Session {
    @PrimaryColumn('uuid')
    id: string;

    @Column('varchar')
    tenantId: string; // Tenant ID for multi-tenancy support

    // ... other fields
}
```

**Issuance Configuration Entity:**

```typescript
@Entity()
export class IssuanceConfig {
    @PrimaryColumn('varchar')
    id: string;

    @Column('varchar')
    tenantId: string;

    // ... other fields
}
```

### Database Queries

All database operations automatically filter by `tenantId` when in multi-tenant
mode:

```typescript
// Example: Get sessions for specific tenant
return this.sessionRepository.findBy({ tenantId });

// Example: Update session with tenant scope
return this.sessionRepository.update({ id: sessionId, tenantId }, updateData);
```
