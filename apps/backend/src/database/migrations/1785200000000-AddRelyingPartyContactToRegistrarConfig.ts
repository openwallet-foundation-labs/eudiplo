import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add `relyingPartyContact` to `registrar_config_entity`: the contact sent
 * when EUDIPLO registers the tenant's relying party at the registrar.
 *
 * Existing rows keep NULL: no contact is sent.
 */
export class AddRelyingPartyContactToRegistrarConfig1785200000000
    implements MigrationInterface
{
    name = "AddRelyingPartyContactToRegistrarConfig1785200000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("registrar_config_entity");
        if (!table) {
            console.log(
                "[Migration] registrar_config_entity table not found — skipping.",
            );
            return;
        }

        if (!table.findColumnByName("relyingPartyContact")) {
            await queryRunner.addColumn(
                "registrar_config_entity",
                new TableColumn({
                    name: "relyingPartyContact",
                    // The entity's type, also on PostgreSQL, so the schema
                    // matches what synchronize creates.
                    type: "json",
                    isNullable: true,
                }),
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("registrar_config_entity");
        if (table?.findColumnByName("relyingPartyContact")) {
            await queryRunner.dropColumn(
                "registrar_config_entity",
                "relyingPartyContact",
            );
        }
    }
}
