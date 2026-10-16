import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add `accessKeyChainId` to `session`: the access key chain an OID4VP request
 * was created with. The request object fetched later is signed with this key
 * chain, so its x5c matches the client_id given in the offer.
 *
 * Existing sessions keep NULL and resolve the key chain as before.
 */
export class AddAccessKeyChainIdToSession1784900000000
    implements MigrationInterface
{
    name = "AddAccessKeyChainIdToSession1784900000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("session");
        if (!table) {
            console.log("[Migration] session table not found — skipping.");
            return;
        }

        if (!table.findColumnByName("accessKeyChainId")) {
            await queryRunner.addColumn(
                "session",
                new TableColumn({
                    name: "accessKeyChainId",
                    type: "varchar",
                    isNullable: true,
                }),
            );
            console.log(
                "[Migration] Added accessKeyChainId column to session.",
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("session");
        if (table?.findColumnByName("accessKeyChainId")) {
            await queryRunner.dropColumn("session", "accessKeyChainId");
        }
    }
}
