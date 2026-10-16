import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add `walletAttestationStatusCheckMode` to `issuance_config`: how the
 * status list of a presented wallet attestation is checked.
 *
 * Existing rows keep NULL, which resolves to best_effort.
 */
export class AddWalletAttestationStatusCheckMode1785000000000
    implements MigrationInterface
{
    name = "AddWalletAttestationStatusCheckMode1785000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("issuance_config");
        if (!table) {
            console.log(
                "[Migration] issuance_config table not found — skipping.",
            );
            return;
        }

        if (!table.findColumnByName("walletAttestationStatusCheckMode")) {
            await queryRunner.addColumn(
                "issuance_config",
                new TableColumn({
                    name: "walletAttestationStatusCheckMode",
                    type: "varchar",
                    isNullable: true,
                }),
            );
            console.log(
                "[Migration] Added walletAttestationStatusCheckMode column to issuance_config.",
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("issuance_config");
        if (table?.findColumnByName("walletAttestationStatusCheckMode")) {
            await queryRunner.dropColumn(
                "issuance_config",
                "walletAttestationStatusCheckMode",
            );
        }
    }
}
