import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add credentialResponseEncryption column to issuance_config table.
 *
 * This migration adds an optional boolean `credentialResponseEncryption`
 * column so each issuance configuration can opt in to advertising
 * `credential_response_encryption` in the credential issuer metadata.
 * It defaults to false because some wallets reject metadata that
 * advertises encryption algorithms they do not support.
 */
export class AddCredentialResponseEncryptionToIssuanceConfig1753000000000
    implements MigrationInterface
{
    name = "AddCredentialResponseEncryptionToIssuanceConfig1753000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("issuance_config");
        if (!table) {
            console.log(
                "[Migration] issuance_config table not found — skipping (schema may not exist yet).",
            );
            return;
        }

        const hasColumn = table.columns.some(
            (col) => col.name === "credentialResponseEncryption",
        );
        if (hasColumn) {
            console.log(
                "[Migration] credentialResponseEncryption column already exists — skipping.",
            );
            return;
        }

        await queryRunner.addColumn(
            "issuance_config",
            new TableColumn({
                name: "credentialResponseEncryption",
                type: "boolean",
                isNullable: false,
                default: false,
            }),
        );

        console.log(
            "[Migration] Added credentialResponseEncryption column to issuance_config.",
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("issuance_config");
        if (table) {
            const hasColumn = table.columns.some(
                (col) => col.name === "credentialResponseEncryption",
            );
            if (hasColumn) {
                await queryRunner.dropColumn(
                    "issuance_config",
                    "credentialResponseEncryption",
                );
                console.log(
                    "[Migration] Removed credentialResponseEncryption column from issuance_config.",
                );
            }
        }
    }
}
