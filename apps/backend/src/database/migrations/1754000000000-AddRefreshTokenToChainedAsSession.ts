import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add refresh token support to the chained_as_session table.
 *
 * - chained_as_session: adds refresh_token and refresh_token_expires_at columns
 *
 * This enables the Chained AS token endpoint to issue refresh tokens when
 * refreshTokenEnabled is set on the issuance configuration.
 */
export class AddRefreshTokenToChainedAsSession1754000000000
    implements MigrationInterface
{
    name = "AddRefreshTokenToChainedAsSession1754000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const isPostgres = queryRunner.connection.options.type === "postgres";

        const table = await queryRunner.getTable("chained_as_session");
        if (!table) {
            console.log(
                "[Migration] chained_as_session table not found — skipping.",
            );
            return;
        }

        if (!table.columns.some((col) => col.name === "refreshToken")) {
            await queryRunner.addColumn(
                "chained_as_session",
                new TableColumn({
                    name: "refreshToken",
                    type: "varchar",
                    isNullable: true,
                }),
            );
            console.log(
                "[Migration] Added refreshToken column to chained_as_session.",
            );
        }

        if (
            !table.columns.some((col) => col.name === "refreshTokenExpiresAt")
        ) {
            await queryRunner.addColumn(
                "chained_as_session",
                new TableColumn({
                    name: "refreshTokenExpiresAt",
                    type: isPostgres ? "timestamp with time zone" : "datetime",
                    isNullable: true,
                }),
            );
            console.log(
                "[Migration] Added refreshTokenExpiresAt column to chained_as_session.",
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("chained_as_session");
        if (!table) return;

        if (table.columns.some((col) => col.name === "refreshTokenExpiresAt")) {
            await queryRunner.dropColumn(
                "chained_as_session",
                "refreshTokenExpiresAt",
            );
        }

        if (table.columns.some((col) => col.name === "refreshToken")) {
            await queryRunner.dropColumn("chained_as_session", "refreshToken");
        }
    }
}
