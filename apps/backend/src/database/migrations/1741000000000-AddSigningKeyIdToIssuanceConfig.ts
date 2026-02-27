import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add signingKeyId column to issuance_config table.
 *
 * This migration adds an optional `signingKeyId` column so each
 * issuance configuration can reference a specific key for signing
 * access tokens. When NULL the default signing key is used.
 */
export class AddSigningKeyIdToIssuanceConfig1741000000000
    implements MigrationInterface
{
    name = "AddSigningKeyIdToIssuanceConfig1741000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("issuance_config");
        if (!table) {
            console.log(
                "[Migration] issuance_config table not found — skipping (schema may not exist yet).",
            );
            return;
        }

        const hasColumn = table.columns.some(
            (col) => col.name === "signingKeyId",
        );
        if (hasColumn) {
            console.log(
                "[Migration] signingKeyId column already exists — skipping.",
            );
            return;
        }

        await queryRunner.addColumn(
            "issuance_config",
            new TableColumn({
                name: "signingKeyId",
                type: "varchar",
                isNullable: true,
            }),
        );

        console.log(
            "[Migration] Added signingKeyId column to issuance_config.",
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("issuance_config");
        if (table) {
            const hasColumn = table.columns.some(
                (col) => col.name === "signingKeyId",
            );
            if (hasColumn) {
                await queryRunner.dropColumn("issuance_config", "signingKeyId");
                console.log(
                    "[Migration] Removed signingKeyId column from issuance_config.",
                );
            }
        }
    }
}
