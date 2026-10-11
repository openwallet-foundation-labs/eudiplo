import type { DataSource } from "typeorm";
import { afterEach, describe, expect, test } from "vitest";
import { ClientEntity } from "../../src/auth/client/entities/client.entity.js";
import { TenantEntity } from "../../src/auth/tenant/entities/tenant.entity.js";
import { AddTokensValidAfterToClient1784800000000 } from "../../src/database/migrations/1784800000000-AddTokensValidAfterToClient.js";

export const addTokensValidAfterEntities = [TenantEntity, ClientEntity];

/**
 * AddTokensValidAfterToClient1784800000000 against a database that
 * `createDb` creates empty, with the schema of `addTokensValidAfterEntities`.
 */
export function addTokensValidAfterContract(
    createDb: () => Promise<DataSource>,
) {
    describe("AddTokensValidAfterToClient1784800000000", () => {
        let db: DataSource;

        afterEach(async () => {
            if (db?.isInitialized) await db.destroy();
        });

        const pendingSchemaChanges = async () =>
            (await db.driver.createSchemaBuilder().log()).upQueries.map(
                (query) => query.query,
            );

        async function run(step: "up" | "down") {
            const queryRunner = db.createQueryRunner();
            await new AddTokensValidAfterToClient1784800000000()[step](
                queryRunner,
            );
            await queryRunner.release();
        }

        test("adds the column with the entity's type, idempotently, and keeps existing clients unlimited", async () => {
            db = await createDb();
            await run("down");
            await db.query(
                `INSERT INTO "tenant_entity" ("id", "name") VALUES ('t', 't')`,
            );
            await db.query(
                `INSERT INTO "client_entity" ("clientId", "tenantId", "roles") VALUES ('existing', 't', '[]')`,
            );

            await run("up");
            await run("up");

            expect(await pendingSchemaChanges()).toEqual([]);
            const clients = db.getRepository(ClientEntity);
            expect(
                (await clients.findOneByOrFail({ clientId: "existing" }))
                    .tokensValidAfter,
            ).toBeNull();
            const validAfter = new Date("2026-03-01T10:15:30.250Z");
            await clients.update(
                { clientId: "existing" },
                { tokensValidAfter: validAfter },
            );
            expect(
                (await clients.findOneByOrFail({ clientId: "existing" }))
                    .tokensValidAfter,
            ).toEqual(validAfter);
        });

        test("down removes the column", async () => {
            db = await createDb();

            await run("down");
            await run("down");

            const table = await db
                .createQueryRunner()
                .getTable("client_entity");
            expect(table?.findColumnByName("tokensValidAfter")).toBeUndefined();
        });
    });
}
