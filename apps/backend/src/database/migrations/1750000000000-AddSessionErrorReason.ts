import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add errorReason column to session table.
 *
 * This migration adds the `errorReason` column to store the reason
 * when a session fails (e.g., validation errors in OID4VP flows).
 * Used when session status is "failed".
 */
export class AddSessionErrorReason1750000000000 implements MigrationInterface {
    name = "AddSessionErrorReason1750000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("session");
        if (!table) {
            console.log(
                "[Migration] session table not found — skipping (schema may not exist yet).",
            );
            return;
        }

        const hasColumn = table.columns.some(
            (col) => col.name === "errorReason",
        );
        if (hasColumn) {
            console.log(
                "[Migration] errorReason column already exists — skipping.",
            );
            return;
        }

        await queryRunner.addColumn(
            "session",
            new TableColumn({
                name: "errorReason",
                type: "text",
                isNullable: true,
            }),
        );

        console.log("[Migration] Added errorReason column to session.");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("session");
        if (table) {
            const hasColumn = table.columns.some(
                (col) => col.name === "errorReason",
            );
            if (hasColumn) {
                await queryRunner.dropColumn("session", "errorReason");
                console.log(
                    "[Migration] Dropped errorReason column from session.",
                );
            }
        }
    }
}
