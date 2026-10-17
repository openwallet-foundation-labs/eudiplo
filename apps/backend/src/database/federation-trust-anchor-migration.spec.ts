import { DataSource } from "typeorm";
import { afterEach, describe, expect, test } from "vitest";
import { ClientEntity } from "../auth/client/entities/client.entity.js";
import { TenantEntity } from "../auth/tenant/entities/tenant.entity.js";
import { FederationTrustAnchorEntity } from "../trust/federation-trust-anchor/entities/federation-trust-anchor.entity.js";
import { AddFederationTrustAnchor1785500000000 } from "./migrations/1785500000000-AddFederationTrustAnchor.js";

describe("AddFederationTrustAnchor1785500000000", () => {
    let dataSource: DataSource | undefined;

    afterEach(async () => {
        await dataSource?.destroy();
        dataSource = undefined;
    });

    async function migrated() {
        dataSource = new DataSource({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [TenantEntity, ClientEntity, FederationTrustAnchorEntity],
        });
        await dataSource.initialize();
        // Every other table as synchronize creates it; only the new table
        // comes from the migration.
        await dataSource.synchronize();
        const queryRunner = dataSource.createQueryRunner();
        const migration = new AddFederationTrustAnchor1785500000000();
        await queryRunner.dropTable("federation_trust_anchor_entity");
        await migration.up(queryRunner);
        await migration.up(queryRunner);
        return { queryRunner, migration };
    }

    test("creates the table with a unique entity ID per tenant idempotently", async () => {
        const { queryRunner, migration } = await migrated();
        const table = await queryRunner.getTable(
            "federation_trust_anchor_entity",
        );
        expect(table?.primaryColumns.map((column) => column.name)).toEqual([
            "id",
            "tenantId",
        ]);
        await dataSource!.getRepository(TenantEntity).insert({
            id: "t",
            name: "t",
        } as TenantEntity);
        const insert = (id: string) =>
            queryRunner.query(
                `INSERT INTO "federation_trust_anchor_entity" ("id", "tenantId", "entityId", "jwks") VALUES (?, 't', 'https://ta.example', '{"keys":[]}')`,
                [id],
            );
        await insert("a");
        await expect(insert("b")).rejects.toThrow(/UNIQUE/);

        await migration.down(queryRunner);
        expect(
            await queryRunner.hasTable("federation_trust_anchor_entity"),
        ).toBe(false);
        await queryRunner.release();
    });

    test("the migrated table matches the entity", async () => {
        const { queryRunner } = await migrated();
        await queryRunner.release();
        const pending = await dataSource!.driver.createSchemaBuilder().log();
        expect(pending.upQueries).toEqual([]);
    });
});
