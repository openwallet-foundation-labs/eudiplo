import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add schemaMeta column to credential_config table.
 *
 * This migration adds a JSON column to store TS11-specific configuration
 * for EUDI Catalogue of Attestations schema metadata generation.
 * The column is optional; when present, the GET /issuer/credentials/:id/schema-metadata
 * endpoint can generate a SchemaMeta document per the TS11 specification.
 *
 * @experimental The underlying TS11 specification is not yet finalized.
 */
export class AddSchemaMetaToCredentialConfig1761000000000
    implements MigrationInterface
{
    name = "AddSchemaMetaToCredentialConfig1761000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("credential_config");
        if (!table) {
            console.log(
                "[Migration] credential_config table not found — skipping (schema may not exist yet).",
            );
            return;
        }

        const hasColumn = table.columns.some(
            (col) => col.name === "schemaMeta",
        );
        if (hasColumn) {
            console.log(
                "[Migration] schemaMeta column already exists — skipping.",
            );
            return;
        }

        await queryRunner.addColumn(
            "credential_config",
            new TableColumn({
                name: "schemaMeta",
                type: "json",
                isNullable: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("credential_config");
        if (!table) {
            console.log(
                "[Migration] credential_config table not found — skipping.",
            );
            return;
        }

        const hasColumn = table.columns.some(
            (col) => col.name === "schemaMeta",
        );
        if (hasColumn) {
            await queryRunner.dropColumn("credential_config", "schemaMeta");
        }
    }
}
