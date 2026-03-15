import {
    MigrationInterface,
    QueryRunner,
    Table,
    TableForeignKey,
    TableIndex,
} from "typeorm";

/**
 * Add session_log_entry table for persistent session log storage.
 *
 * Stores structured log entries per session to enable
 * debugging and observability via the API.
 */
export class AddSessionLogEntry1749000000000 implements MigrationInterface {
    name = "AddSessionLogEntry1749000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const existingTable =
            await queryRunner.getTable("session_log_entry");
        if (existingTable) {
            console.log(
                "[Migration] session_log_entry table already exists — skipping.",
            );
            return;
        }

        // Skip if session table doesn't exist yet (fresh install with synchronize)
        const sessionTable = await queryRunner.getTable("session");
        if (!sessionTable) {
            console.log(
                "[Migration] session table not found — skipping (schema may not exist yet).",
            );
            return;
        }

        const isPostgres =
            queryRunner.connection.options.type === "postgres";

        await queryRunner.createTable(
            new Table({
                name: "session_log_entry",
                columns: [
                    {
                        name: "id",
                        type: isPostgres ? "uuid" : "varchar",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "uuid",
                    },
                    {
                        name: "sessionId",
                        type: "varchar",
                        isNullable: false,
                    },
                    {
                        name: "timestamp",
                        type: isPostgres
                            ? "timestamp with time zone"
                            : "datetime",
                        default: isPostgres ? "now()" : "(datetime('now'))",
                    },
                    {
                        name: "level",
                        type: "varchar",
                        isNullable: false,
                    },
                    {
                        name: "stage",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "message",
                        type: "varchar",
                        isNullable: false,
                    },
                    {
                        name: "detail",
                        type: isPostgres ? "jsonb" : "json",
                        isNullable: true,
                    },
                ],
            }),
            true,
        );

        await queryRunner.createIndex(
            "session_log_entry",
            new TableIndex({
                name: "IDX_session_log_entry_sessionId",
                columnNames: ["sessionId"],
            }),
        );

        await queryRunner.createForeignKey(
            "session_log_entry",
            new TableForeignKey({
                columnNames: ["sessionId"],
                referencedTableName: "session",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            }),
        );

        console.log("[Migration] Created session_log_entry table.");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("session_log_entry");
        if (table) {
            const foreignKeys = table.foreignKeys.filter((fk) =>
                fk.columnNames.includes("sessionId"),
            );
            for (const fk of foreignKeys) {
                await queryRunner.dropForeignKey("session_log_entry", fk);
            }
            await queryRunner.dropTable("session_log_entry");
            console.log("[Migration] Dropped session_log_entry table.");
        }
    }
}
