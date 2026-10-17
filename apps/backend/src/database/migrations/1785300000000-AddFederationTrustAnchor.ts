import {
    MigrationInterface,
    QueryRunner,
    Table,
    TableForeignKey,
    TableIndex,
} from "typeorm";

/**
 * Adds `federation_trust_anchor_entity`: the OpenID Federation trust anchors
 * of a tenant with their pinned federation keys. A tenant's entity IDs are
 * unique.
 */
export class AddFederationTrustAnchor1785300000000
    implements MigrationInterface
{
    name = "AddFederationTrustAnchor1785300000000";

    async up(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasTable("federation_trust_anchor_entity")) {
            return;
        }
        await queryRunner.createTable(
            new Table({
                name: "federation_trust_anchor_entity",
                columns: [
                    { name: "id", type: "varchar", isPrimary: true },
                    { name: "tenantId", type: "varchar", isPrimary: true },
                    { name: "entityId", type: "varchar" },
                    { name: "description", type: "varchar", isNullable: true },
                    { name: "jwks", type: "json" },
                ],
                indices: [
                    new TableIndex({
                        name: "IDX_federation_trust_anchor_entity_id",
                        columnNames: ["tenantId", "entityId"],
                        isUnique: true,
                    }),
                ],
                foreignKeys: [
                    new TableForeignKey({
                        columnNames: ["tenantId"],
                        referencedTableName: "tenant_entity",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE",
                    }),
                ],
            }),
            true,
        );
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasTable("federation_trust_anchor_entity")) {
            await queryRunner.dropTable("federation_trust_anchor_entity");
        }
    }
}
