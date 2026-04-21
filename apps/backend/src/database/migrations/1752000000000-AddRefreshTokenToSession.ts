import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add refresh token support to session and issuance config.
 *
 * - Session: adds refresh_token and refresh_token_expires_at columns
 * - IssuanceConfig: adds refreshTokenEnabled and refreshTokenExpiresInSeconds columns
 *
 * This allows clients to obtain new access tokens without requiring a new authorization request.
 */
export class AddRefreshTokenToSession1752000000000
    implements MigrationInterface
{
    name = "AddRefreshTokenToSession1752000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add columns to session table
        const sessionTable = await queryRunner.getTable("session");
        if (!sessionTable) {
            console.log(
                "[Migration] session table not found — skipping (schema may not exist yet).",
            );
        } else {
            const hasRefreshToken = sessionTable.columns.some(
                (col) => col.name === "refresh_token",
            );
            if (!hasRefreshToken) {
                await queryRunner.addColumn(
                    "session",
                    new TableColumn({
                        name: "refresh_token",
                        type: "varchar",
                        isNullable: true,
                    }),
                );
                console.log(
                    "[Migration] Added refresh_token column to session.",
                );
            }

            const hasRefreshTokenExpiresAt = sessionTable.columns.some(
                (col) => col.name === "refresh_token_expires_at",
            );
            if (!hasRefreshTokenExpiresAt) {
                await queryRunner.addColumn(
                    "session",
                    new TableColumn({
                        name: "refresh_token_expires_at",
                        type: "datetime",
                        isNullable: true,
                    }),
                );
                console.log(
                    "[Migration] Added refresh_token_expires_at column to session.",
                );
            }
        }

        // Add columns to issuance_config table
        const issuanceConfigTable =
            await queryRunner.getTable("issuance_config");
        if (!issuanceConfigTable) {
            console.log(
                "[Migration] issuance_config table not found — skipping (schema may not exist yet).",
            );
        } else {
            const hasRefreshTokenEnabled = issuanceConfigTable.columns.some(
                (col) => col.name === "refreshTokenEnabled",
            );
            if (!hasRefreshTokenEnabled) {
                await queryRunner.addColumn(
                    "issuance_config",
                    new TableColumn({
                        name: "refreshTokenEnabled",
                        type: "boolean",
                        default: true,
                        isNullable: false,
                    }),
                );
                console.log(
                    "[Migration] Added refreshTokenEnabled column to issuance_config.",
                );
            }

            const hasRefreshTokenExpiresInSeconds =
                issuanceConfigTable.columns.some(
                    (col) => col.name === "refreshTokenExpiresInSeconds",
                );
            if (!hasRefreshTokenExpiresInSeconds) {
                await queryRunner.addColumn(
                    "issuance_config",
                    new TableColumn({
                        name: "refreshTokenExpiresInSeconds",
                        type: "int",
                        default: 2592000,
                        isNullable: true,
                    }),
                );
                console.log(
                    "[Migration] Added refreshTokenExpiresInSeconds column to issuance_config.",
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop from session table
        const sessionTable = await queryRunner.getTable("session");
        if (sessionTable) {
            const hasRefreshTokenExpiresAt = sessionTable.columns.some(
                (col) => col.name === "refresh_token_expires_at",
            );
            if (hasRefreshTokenExpiresAt) {
                await queryRunner.dropColumn(
                    "session",
                    "refresh_token_expires_at",
                );
            }

            const hasRefreshToken = sessionTable.columns.some(
                (col) => col.name === "refresh_token",
            );
            if (hasRefreshToken) {
                await queryRunner.dropColumn("session", "refresh_token");
            }
        }

        // Drop from issuance_config table
        const issuanceConfigTable =
            await queryRunner.getTable("issuance_config");
        if (issuanceConfigTable) {
            const hasRefreshTokenExpiresInSeconds =
                issuanceConfigTable.columns.some(
                    (col) => col.name === "refreshTokenExpiresInSeconds",
                );
            if (hasRefreshTokenExpiresInSeconds) {
                await queryRunner.dropColumn(
                    "issuance_config",
                    "refreshTokenExpiresInSeconds",
                );
            }

            const hasRefreshTokenEnabled = issuanceConfigTable.columns.some(
                (col) => col.name === "refreshTokenEnabled",
            );
            if (hasRefreshTokenEnabled) {
                await queryRunner.dropColumn(
                    "issuance_config",
                    "refreshTokenEnabled",
                );
            }
        }
    }
}
