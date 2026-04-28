import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add credentialRequestEncryption column to issuance_config table.
 *
 * This migration adds an optional boolean `credentialRequestEncryption`
 * column so each issuance configuration can opt in to advertising
 * `credential_request_encryption` in the credential issuer metadata,
 * which publishes the issuer's encryption public key so wallets can
 * send encrypted credential requests.
 * It defaults to false because not all wallets support this feature.
 */
export class AddCredentialRequestEncryptionToIssuanceConfig1753100000000
    implements MigrationInterface
{
    name = "AddCredentialRequestEncryptionToIssuanceConfig1753100000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("issuance_config");
        if (!table) {
            console.log(
                "[Migration] issuance_config table not found — skipping (schema may not exist yet).",
            );
            return;
        }

        const hasColumn = table.columns.some(
            (col) => col.name === "credentialRequestEncryption",
        );
        if (hasColumn) {
            console.log(
                "[Migration] credentialRequestEncryption column already exists — skipping.",
            );
            return;
        }

        await queryRunner.addColumn(
            "issuance_config",
            new TableColumn({
                name: "credentialRequestEncryption",
                type: "boolean",
                isNullable: false,
                default: false,
            }),
        );

        console.log(
            "[Migration] Added credentialRequestEncryption column to issuance_config.",
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("issuance_config");
        if (table) {
            const hasColumn = table.columns.some(
                (col) => col.name === "credentialRequestEncryption",
            );
            if (hasColumn) {
                await queryRunner.dropColumn(
                    "issuance_config",
                    "credentialRequestEncryption",
                );
                console.log(
                    "[Migration] Removed credentialRequestEncryption column from issuance_config.",
                );
            }
        }
    }
}
