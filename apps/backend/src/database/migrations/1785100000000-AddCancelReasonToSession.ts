import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add `cancelReason` to `session`: the reason an operator gave when cancelling
 * the session, shown with the session's result.
 *
 * Existing sessions keep NULL; their reason stays in the session log.
 */
export class AddCancelReasonToSession1785100000000
    implements MigrationInterface
{
    name = "AddCancelReasonToSession1785100000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("session");
        if (!table) {
            console.log("[Migration] session table not found — skipping.");
            return;
        }

        if (!table.findColumnByName("cancelReason")) {
            await queryRunner.addColumn(
                "session",
                new TableColumn({
                    name: "cancelReason",
                    type: "text",
                    isNullable: true,
                }),
            );
            console.log("[Migration] Added cancelReason column to session.");
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("session");
        if (table?.findColumnByName("cancelReason")) {
            await queryRunner.dropColumn("session", "cancelReason");
        }
    }
}
