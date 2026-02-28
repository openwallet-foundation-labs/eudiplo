import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add kmsProvider column to key_entity table.
 *
 * This migration adds the `kmsProvider` column to support multiple
 * Key Management Systems per key. Existing keys default to "db".
 *
 * The column stores the name of the KMS provider that manages each key,
 * allowing different keys to use different backends (e.g., db, vault).
 */
export class AddKmsProvider1740500000000 implements MigrationInterface {
    name = "AddKmsProvider1740500000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("key_entity");
        if (!table) {
            console.log(
                "[Migration] key_entity table not found — skipping (schema may not exist yet).",
            );
            return;
        }

        const hasColumn = table.columns.some(
            (col) => col.name === "kmsProvider",
        );
        if (hasColumn) {
            console.log(
                "[Migration] kmsProvider column already exists — skipping.",
            );
            return;
        }

        await queryRunner.addColumn(
            "key_entity",
            new TableColumn({
                name: "kmsProvider",
                type: "varchar",
                default: "'db'",
                isNullable: false,
            }),
        );

        console.log(
            '[Migration] Added kmsProvider column to key_entity with default "db".',
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("key_entity");
        if (table) {
            const hasColumn = table.columns.some(
                (col) => col.name === "kmsProvider",
            );
            if (hasColumn) {
                await queryRunner.dropColumn("key_entity", "kmsProvider");
                console.log(
                    "[Migration] Removed kmsProvider column from key_entity.",
                );
            }
        }
    }
}
