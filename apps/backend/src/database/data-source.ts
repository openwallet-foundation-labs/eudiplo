import { join } from "node:path";
import { config } from "dotenv";
import { DataSource, DataSourceOptions } from "typeorm";

// Load environment variables
config({ path: join(__dirname, "..", "..", ".env") });
config({ path: join(__dirname, "..", "..", "..", "..", ".env") });

const dbType = process.env.DB_TYPE as "sqlite" | "postgres" | undefined;

const commonOptions: Partial<DataSourceOptions> = {
    synchronize: false,
    logging: process.env.DB_LOGGING === "true",
    migrations: [join(__dirname, "migrations", "*.{ts,js}")],
    migrationsTableName: "typeorm_migrations",
    // Entity patterns - TypeORM CLI needs explicit patterns
    entities: [join(__dirname, "..", "**", "*.entity.{ts,js}")],
};

let dataSourceOptions: DataSourceOptions;

if (dbType === "postgres") {
    dataSourceOptions = {
        type: "postgres",
        host: process.env.DB_HOST || "localhost",
        port: Number.parseInt(process.env.DB_PORT || "5432", 10),
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_DATABASE || "eudiplo",
        ...commonOptions,
    } as DataSourceOptions;
} else {
    const folder = process.env.FOLDER || "./assets";
    dataSourceOptions = {
        type: "sqlite",
        database: join(folder, "service.db"),
        ...commonOptions,
    } as DataSourceOptions;
}

export const AppDataSource = new DataSource(dataSourceOptions);
