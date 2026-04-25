import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add server-managed `registrationCertCache` column to `presentation_config`.
 *
 * Stores the materialized registration certificate JWT plus fingerprints used
 * to detect drift between the cached cert and the current presentation config
 * (DCQL query / registrationCert spec). Invalidated/refreshed at save-time and
 * (lazily) at request-time.
 */
export class AddRegistrationCertCacheToPresentationConfig1756000000000
    implements MigrationInterface
{
    name = "AddRegistrationCertCacheToPresentationConfig1756000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const isPostgres = queryRunner.connection.options.type === "postgres";
        const table = await queryRunner.getTable("presentation_config");

        if (!table) {
            console.log(
                "[Migration] presentation_config table not found - skipping.",
            );
            return;
        }

        if (
            !table.columns.some((col) => col.name === "registrationCertCache")
        ) {
            await queryRunner.addColumn(
                "presentation_config",
                new TableColumn({
                    name: "registrationCertCache",
                    type: isPostgres ? "jsonb" : "json",
                    isNullable: true,
                }),
            );
            console.log(
                "[Migration] Added registrationCertCache to presentation_config.",
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("presentation_config");
        if (!table) {
            return;
        }

        if (table.columns.some((col) => col.name === "registrationCertCache")) {
            await queryRunner.dropColumn(
                "presentation_config",
                "registrationCertCache",
            );
        }
    }
}
