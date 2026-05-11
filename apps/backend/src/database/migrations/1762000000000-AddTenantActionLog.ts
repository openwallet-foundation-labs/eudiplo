import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

/**
 * Add tenant_action_log table for immutable tenant change audit trail.
 */
export class AddTenantActionLog1762000000000 implements MigrationInterface {
    name = "AddTenantActionLog1762000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const existingTable = await queryRunner.getTable("tenant_action_log");
        if (existingTable) {
            console.log(
                "[Migration] tenant_action_log table already exists - skipping.",
            );
            return;
        }

        const isPostgres = queryRunner.connection.options.type === "postgres";

        await queryRunner.createTable(
            new Table({
                name: "tenant_action_log",
                columns: [
                    {
                        name: "id",
                        type: isPostgres ? "uuid" : "varchar",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "uuid",
                    },
                    {
                        name: "tenantId",
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
                        name: "actionType",
                        type: "varchar",
                        isNullable: false,
                    },
                    {
                        name: "actorType",
                        type: "varchar",
                        isNullable: false,
                    },
                    {
                        name: "actorId",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "actorDisplay",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "changedFields",
                        type: isPostgres ? "jsonb" : "json",
                        isNullable: true,
                    },
                    {
                        name: "before",
                        type: isPostgres ? "jsonb" : "json",
                        isNullable: true,
                    },
                    {
                        name: "after",
                        type: isPostgres ? "jsonb" : "json",
                        isNullable: true,
                    },
                    {
                        name: "requestId",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "ip",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "userAgent",
                        type: "varchar",
                        isNullable: true,
                    },
                ],
            }),
            true,
        );

        await queryRunner.createIndex(
            "tenant_action_log",
            new TableIndex({
                name: "IDX_tenant_action_log_tenantId",
                columnNames: ["tenantId"],
            }),
        );

        await queryRunner.createIndex(
            "tenant_action_log",
            new TableIndex({
                name: "IDX_tenant_action_log_timestamp",
                columnNames: ["timestamp"],
            }),
        );

        console.log("[Migration] Created tenant_action_log table.");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("tenant_action_log");
        if (table) {
            await queryRunner.dropTable("tenant_action_log");
            console.log("[Migration] Dropped tenant_action_log table.");
        }
    }
}
