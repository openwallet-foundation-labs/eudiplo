import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration to flatten key_usage_entity into a single usageType column on key_entity.
 *
 * This simplifies the data model:
 * - Before: key_entity -> key_usage_entity (one-to-many)
 * - After: key_entity.usageType (single nullable column)
 *
 * Root CA keys will have null usageType since they only sign other keys.
 *
 * NOTE: This migration is for the legacy key_entity table. New deployments use
 * key_chain_entity instead, and this migration will be skipped.
 */
export class FlattenKeyUsageType1746000000000 implements MigrationInterface {
    name = "FlattenKeyUsageType1746000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if key_entity table exists (legacy schema)
        const tableExists = await this.tableExists(queryRunner, "key_entity");
        if (!tableExists) {
            console.log(
                "[Migration] FlattenKeyUsageType: key_entity table not found — skipping (new schema uses key_chain_entity).",
            );
            return;
        }

        // Check if usageType column already exists
        const keyTable = await queryRunner.getTable("key_entity");
        const hasUsageType = keyTable?.columns.some(
            (col) => col.name === "usageType",
        );
        if (hasUsageType) {
            console.log(
                "[Migration] FlattenKeyUsageType: usageType column already exists — skipping.",
            );
            return;
        }

        // Step 1: Add usageType column to key_entity
        await queryRunner.query(
            `ALTER TABLE "key_entity" ADD COLUMN "usageType" varchar`,
        );

        // Step 2: Migrate data from key_usage_entity to key_entity.usageType
        const keyUsageTableExists = await this.tableExists(
            queryRunner,
            "key_usage_entity",
        );
        if (keyUsageTableExists) {
            await queryRunner.query(`
                UPDATE "key_entity" AS k
                SET "usageType" = (
                    SELECT u."usage"
                    FROM "key_usage_entity" u
                    WHERE u."keyId" = k."id" AND u."tenantId" = k."tenantId"
                    LIMIT 1
                )
            `);

            // Step 3: Drop the key_usage_entity table
            await queryRunner.query(`DROP TABLE IF EXISTS "key_usage_entity"`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Check if key_entity table exists
        const tableExists = await this.tableExists(queryRunner, "key_entity");
        if (!tableExists) {
            console.log(
                "[Migration] FlattenKeyUsageType down: key_entity table not found — skipping.",
            );
            return;
        }

        // Step 1: Recreate key_usage_entity table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "key_usage_entity" (
                "tenantId" varchar NOT NULL,
                "keyId" varchar NOT NULL,
                "usage" varchar NOT NULL,
                PRIMARY KEY ("tenantId", "keyId", "usage"),
                CONSTRAINT "FK_key_usage_entity_key" FOREIGN KEY ("keyId", "tenantId")
                    REFERENCES "key_entity" ("id", "tenantId") ON DELETE CASCADE
            )
        `);

        // Step 2: Migrate data back from key_entity.usageType to key_usage_entity
        await queryRunner.query(`
            INSERT INTO "key_usage_entity" ("tenantId", "keyId", "usage")
            SELECT k."tenantId", k."id", k."usageType"
            FROM "key_entity" k
            WHERE k."usageType" IS NOT NULL
        `);

        // Step 3: Drop the usageType column from key_entity
        await queryRunner.query(
            `ALTER TABLE "key_entity" DROP COLUMN "usageType"`,
        );
    }

    private async tableExists(
        queryRunner: QueryRunner,
        tableName: string,
    ): Promise<boolean> {
        const table = await queryRunner.getTable(tableName);
        return !!table;
    }
}
