import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

/**
 * Create chained_as_dpop_jti table for distributed DPoP replay protection.
 *
 * Replaces the in-memory dpopJtiCache in ChainedAsService so that replay
 * protection works correctly when the backend runs with multiple instances.
 */
export class AddChainedAsDpopJti1753000000000 implements MigrationInterface {
    name = "AddChainedAsDpopJti1753000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable("chained_as_dpop_jti");
        if (tableExists) {
            console.log(
                "[Migration] chained_as_dpop_jti table already exists — skipping.",
            );
            return;
        }

        const isPostgres = queryRunner.connection.options.type === "postgres";

        await queryRunner.createTable(
            new Table({
                name: "chained_as_dpop_jti",
                columns: [
                    {
                        name: "tenantId",
                        type: "varchar",
                        isPrimary: true,
                    },
                    {
                        name: "jti",
                        type: "varchar",
                        isPrimary: true,
                    },
                    {
                        name: "expiresAt",
                        type: isPostgres
                            ? "timestamp with time zone"
                            : "datetime",
                        isNullable: false,
                    },
                ],
            }),
        );

        // Index to efficiently purge expired rows
        await queryRunner.createIndex(
            "chained_as_dpop_jti",
            new TableIndex({
                name: "IDX_chained_as_dpop_jti_expires",
                columnNames: ["expiresAt"],
            }),
        );

        console.log("[Migration] Created chained_as_dpop_jti table.");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("chained_as_dpop_jti", true);
    }
}
