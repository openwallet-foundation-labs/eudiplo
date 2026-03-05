import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add externalKeyId column to key_entity table.
 *
 * This migration adds the `externalKeyId` column to store external KMS
 * key identifiers (e.g., AWS KMS Key ID, Azure Key Vault Key ID).
 *
 * This keeps provider-specific key references separate from the JWK,
 * avoiding issues where non-standard JWK fields could be stripped
 * by DTOs or other code paths.
 */
export class AddExternalKeyId1742000000000 implements MigrationInterface {
    name = "AddExternalKeyId1742000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("key_entity");
        if (!table) {
            console.log(
                "[Migration] key_entity table not found — skipping (schema may not exist yet).",
            );
            return;
        }

        const hasColumn = table.columns.some(
            (col) => col.name === "externalKeyId",
        );
        if (hasColumn) {
            console.log(
                "[Migration] externalKeyId column already exists — skipping.",
            );
            return;
        }

        await queryRunner.addColumn(
            "key_entity",
            new TableColumn({
                name: "externalKeyId",
                type: "varchar",
                isNullable: true,
            }),
        );

        console.log("[Migration] Added externalKeyId column to key_entity.");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("key_entity");
        if (!table) {
            return;
        }

        const hasColumn = table.columns.some(
            (col) => col.name === "externalKeyId",
        );
        if (!hasColumn) {
            return;
        }

        await queryRunner.dropColumn("key_entity", "externalKeyId");
        console.log(
            "[Migration] Dropped externalKeyId column from key_entity.",
        );
    }
}
