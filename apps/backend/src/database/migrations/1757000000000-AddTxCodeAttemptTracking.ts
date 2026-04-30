import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add tx_code brute-force protection fields.
 *
 * - Session: adds txCodeFailedAttempts column (int, default 0) to track
 *   the number of failed transaction code validation attempts in the
 *   OID4VCI pre-authorized code flow.
 * - IssuanceConfig: adds txCodeMaxAttempts column (int, nullable) to configure
 *   the maximum allowed failed attempts before the pre-authorized code is
 *   invalidated. When null the service default of 5 is used.
 */
export class AddTxCodeAttemptTracking1757000000000
    implements MigrationInterface
{
    name = "AddTxCodeAttemptTracking1757000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add txCodeFailedAttempts to session table
        const sessionTable = await queryRunner.getTable("session");
        if (!sessionTable) {
            console.log(
                "[Migration] session table not found — skipping (schema may not exist yet).",
            );
        } else {
            const hasTxCodeFailedAttempts = sessionTable.columns.some(
                (col) => col.name === "txCodeFailedAttempts",
            );
            if (!hasTxCodeFailedAttempts) {
                await queryRunner.addColumn(
                    "session",
                    new TableColumn({
                        name: "txCodeFailedAttempts",
                        type: "int",
                        default: 0,
                        isNullable: false,
                    }),
                );
                console.log(
                    "[Migration] Added txCodeFailedAttempts column to session.",
                );
            }
        }

        // Add txCodeMaxAttempts to issuance_config table
        const issuanceConfigTable =
            await queryRunner.getTable("issuance_config");
        if (!issuanceConfigTable) {
            console.log(
                "[Migration] issuance_config table not found — skipping (schema may not exist yet).",
            );
        } else {
            const hasTxCodeMaxAttempts = issuanceConfigTable.columns.some(
                (col) => col.name === "txCodeMaxAttempts",
            );
            if (!hasTxCodeMaxAttempts) {
                await queryRunner.addColumn(
                    "issuance_config",
                    new TableColumn({
                        name: "txCodeMaxAttempts",
                        type: "int",
                        isNullable: true,
                    }),
                );
                console.log(
                    "[Migration] Added txCodeMaxAttempts column to issuance_config.",
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove txCodeFailedAttempts from session table
        const sessionTable = await queryRunner.getTable("session");
        if (sessionTable) {
            const hasTxCodeFailedAttempts = sessionTable.columns.some(
                (col) => col.name === "txCodeFailedAttempts",
            );
            if (hasTxCodeFailedAttempts) {
                await queryRunner.dropColumn("session", "txCodeFailedAttempts");
                console.log(
                    "[Migration] Removed txCodeFailedAttempts column from session.",
                );
            }
        }

        // Remove txCodeMaxAttempts from issuance_config table
        const issuanceConfigTable =
            await queryRunner.getTable("issuance_config");
        if (issuanceConfigTable) {
            const hasTxCodeMaxAttempts = issuanceConfigTable.columns.some(
                (col) => col.name === "txCodeMaxAttempts",
            );
            if (hasTxCodeMaxAttempts) {
                await queryRunner.dropColumn(
                    "issuance_config",
                    "txCodeMaxAttempts",
                );
                console.log(
                    "[Migration] Removed txCodeMaxAttempts column from issuance_config.",
                );
            }
        }
    }
}
