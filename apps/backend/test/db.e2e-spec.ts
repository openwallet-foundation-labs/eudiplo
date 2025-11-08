import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import {
    PostgreSqlContainer,
    StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Client } from "pg";
import { App } from "supertest/types";
import { beforeAll, describe, test } from "vitest";
import { AppModule } from "../src/app.module";

describe("Postgres", () => {
    let app: INestApplication<App>;

    let postgresContainer!: StartedPostgreSqlContainer;
    let postgresClient!: Client;

    beforeAll(async () => {
        postgresContainer = await new PostgreSqlContainer("postgres:alpine")
            .withUsername("test_user")
            .withPassword("test_password")
            .withDatabase("test_db")
            .withExposedPorts(5432)
            .start();

        // Get actual container connection details
        const containerPort = postgresContainer.getMappedPort(5432);
        const containerHost = postgresContainer.getHost();

        postgresClient = new Client({
            connectionString: postgresContainer.getConnectionUri(),
        });
        await postgresClient.connect();

        // Create test config
        const testConfig = {
            DB_TYPE: "postgres",
            DB_HOST: containerHost,
            DB_PORT: containerPort.toString(),
            DB_USERNAME: postgresContainer.getUsername(),
            DB_PASSWORD: postgresContainer.getPassword(),
            DB_DATABASE: postgresContainer.getDatabase(),
        };

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    load: [() => testConfig],
                }),
                AppModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());

        await app.init();
    }, 60000);

    test("db tables exist", async () => {
        const res = await postgresClient.query(`
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public';
        `);

        const tableNames = res.rows.map((row) => row.tablename);

        // Check for some expected tables
        expect(tableNames).toContain("client_entity");
    });

    afterAll(async () => {
        await app.close();
        await postgresClient.end();
        await postgresContainer.stop();
    });
});
