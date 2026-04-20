import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add walletNonce and responseCode columns to session table.
 *
 * Per OID4VP spec Section 13.3 (direct_post response mode security):
 * - walletNonce: Separates wallet-facing identifier (request-id) from
 *   session ID (transaction-id) to prevent session fixation.
 * - responseCode: Generated after VP Token processing, included in
 *   redirect_uri so only the legitimate frontend can confirm completion.
 */
export class AddDirectPostSecurityFields1751000000000
    implements MigrationInterface
{
    name = "AddDirectPostSecurityFields1751000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("session");
        if (!table) {
            console.log(
                "[Migration] session table not found — skipping (schema may not exist yet).",
            );
            return;
        }

        const hasWalletNonce = table.columns.some(
            (col) => col.name === "walletNonce",
        );
        if (!hasWalletNonce) {
            await queryRunner.addColumn(
                "session",
                new TableColumn({
                    name: "walletNonce",
                    type: "varchar",
                    isNullable: true,
                }),
            );
            console.log("[Migration] Added walletNonce column to session.");
        } else {
            console.log(
                "[Migration] walletNonce column already exists — skipping.",
            );
        }

        const hasResponseCode = table.columns.some(
            (col) => col.name === "responseCode",
        );
        if (!hasResponseCode) {
            await queryRunner.addColumn(
                "session",
                new TableColumn({
                    name: "responseCode",
                    type: "varchar",
                    isNullable: true,
                }),
            );
            console.log("[Migration] Added responseCode column to session.");
        } else {
            console.log(
                "[Migration] responseCode column already exists — skipping.",
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("session");
        if (table) {
            const hasResponseCode = table.columns.some(
                (col) => col.name === "responseCode",
            );
            if (hasResponseCode) {
                await queryRunner.dropColumn("session", "responseCode");
            }

            const hasWalletNonce = table.columns.some(
                (col) => col.name === "walletNonce",
            );
            if (hasWalletNonce) {
                await queryRunner.dropColumn("session", "walletNonce");
            }
        }
    }
}
