import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add preferredAuthServer column to issuance_config table.
 *
 * This migration adds an optional `preferredAuthServer` column so each
 * issuance configuration can specify which authorization server should
 * appear first in the credential issuer metadata. Wallets typically
 * use the first AS for wallet-initiated flows.
 */
export class AddPreferredAuthServerToIssuanceConfig1741500000000
    implements MigrationInterface
{
    name = "AddPreferredAuthServerToIssuanceConfig1741500000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("issuance_config");
        if (!table) {
            console.log(
                "[Migration] issuance_config table not found — skipping (schema may not exist yet).",
            );
            return;
        }

        const hasColumn = table.columns.some(
            (col) => col.name === "preferredAuthServer",
        );
        if (hasColumn) {
            console.log(
                "[Migration] preferredAuthServer column already exists — skipping.",
            );
            return;
        }

        await queryRunner.addColumn(
            "issuance_config",
            new TableColumn({
                name: "preferredAuthServer",
                type: "varchar",
                isNullable: true,
            }),
        );

        console.log(
            "[Migration] Added preferredAuthServer column to issuance_config.",
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("issuance_config");
        if (table) {
            const hasColumn = table.columns.some(
                (col) => col.name === "preferredAuthServer",
            );
            if (hasColumn) {
                await queryRunner.dropColumn(
                    "issuance_config",
                    "preferredAuthServer",
                );
                console.log(
                    "[Migration] Removed preferredAuthServer column from issuance_config.",
                );
            }
        }
    }
}
