import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add federation column to issuance_config table.
 *
 * Stores optional OpenID Federation trust configuration for issuance and
 * verification trust decisions. The column is nullable so existing tenants
 * remain unchanged.
 */
export class AddFederationToIssuanceConfig1763000000000
    implements MigrationInterface
{
    name = "AddFederationToIssuanceConfig1763000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("issuance_config");
        if (!table) {
            console.log(
                "[Migration] issuance_config table not found - skipping (schema may not exist yet).",
            );
            return;
        }

        const hasColumn = table.columns.some(
            (col) => col.name === "federation",
        );
        if (hasColumn) {
            console.log(
                "[Migration] federation column already exists - skipping.",
            );
            return;
        }

        await queryRunner.addColumn(
            "issuance_config",
            new TableColumn({
                name: "federation",
                type: "json",
                isNullable: true,
            }),
        );

        console.log("[Migration] Added federation column to issuance_config.");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("issuance_config");
        if (table) {
            const hasColumn = table.columns.some(
                (col) => col.name === "federation",
            );
            if (hasColumn) {
                await queryRunner.dropColumn("issuance_config", "federation");
                console.log(
                    "[Migration] Removed federation column from issuance_config.",
                );
            }
        }
    }
}
