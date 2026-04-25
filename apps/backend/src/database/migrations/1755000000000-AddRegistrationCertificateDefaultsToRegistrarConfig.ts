import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add optional registrationCertificateDefaults to registrar_config_entity.
 *
 * This allows tenant-level reusable defaults for registration certificate
 * creation while keeping presentation-specific fields in presentation configs.
 */
export class AddRegistrationCertificateDefaultsToRegistrarConfig1755000000000
    implements MigrationInterface
{
    name = "AddRegistrationCertificateDefaultsToRegistrarConfig1755000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const isPostgres = queryRunner.connection.options.type === "postgres";
        const table = await queryRunner.getTable("registrar_config_entity");

        if (!table) {
            console.log(
                "[Migration] registrar_config_entity table not found - skipping.",
            );
            return;
        }

        if (
            !table.columns.some(
                (col) => col.name === "registrationCertificateDefaults",
            )
        ) {
            await queryRunner.addColumn(
                "registrar_config_entity",
                new TableColumn({
                    name: "registrationCertificateDefaults",
                    type: isPostgres ? "jsonb" : "json",
                    isNullable: true,
                }),
            );
            console.log(
                "[Migration] Added registrationCertificateDefaults to registrar_config_entity.",
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("registrar_config_entity");
        if (!table) {
            return;
        }

        if (
            table.columns.some(
                (col) => col.name === "registrationCertificateDefaults",
            )
        ) {
            await queryRunner.dropColumn(
                "registrar_config_entity",
                "registrationCertificateDefaults",
            );
        }
    }
}
