import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Add `tokensValidAfter` to `client_entity`: when the client was created or
 * got its current secret, in milliseconds since the epoch. Tokens of the
 * built-in OAuth2 server carry it and are rejected when it changes. Nullable;
 * clients created before this migration keep accepting their tokens until a
 * secret change or until they are deleted.
 */
export class AddTokensValidAfterToClient1784800000000
    implements MigrationInterface
{
    name = "AddTokensValidAfterToClient1784800000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("client_entity");
        if (!table) {
            console.log(
                "[Migration] client_entity table not found — skipping (schema may not exist yet).",
            );
            return;
        }
        if (table.findColumnByName("tokensValidAfter")) {
            console.log(
                "[Migration] tokensValidAfter column already exists — skipping.",
            );
            return;
        }

        await queryRunner.addColumn(
            "client_entity",
            new TableColumn({
                name: "tokensValidAfter",
                type: "bigint",
                isNullable: true,
            }),
        );
        console.log(
            "[Migration] Added tokensValidAfter column to client_entity.",
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("client_entity");
        if (table?.findColumnByName("tokensValidAfter")) {
            await queryRunner.dropColumn("client_entity", "tokensValidAfter");
        }
    }
}
