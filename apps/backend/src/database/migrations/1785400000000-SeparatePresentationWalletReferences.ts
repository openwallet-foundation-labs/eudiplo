import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Stop presentation flows from accepting the session ID as wallet reference.
 *
 * - ISO 18013-7 sessions get a `walletNonce`, the only value their response
 *   endpoint accepts. Sessions created before have their ID as `walletNonce`,
 *   so pages that already hold the 9.x response URL can still post to it;
 *   for these sessions the ID stays a bearer value until they end.
 * - `interactive_auth_session.presentationSessionId` names the verifier
 *   session of an OpenID4VP step, which used to have the `auth_session` as
 *   ID. Existing auth sessions get their `auth_session`, which is the ID of
 *   the verifier session they created.
 *
 * `down()` clears only the backfilled ISO 18013-7 values and drops the
 * column: ISO 18013-7 sessions created by 10.0 keep their random nonce, and
 * 9.x does not find them by it. Interactive authorizations started by 10.0
 * that are still open fail their OpenID4VP step on 9.x.
 */
export class SeparatePresentationWalletReferences1785400000000
    implements MigrationInterface
{
    name = "SeparatePresentationWalletReferences1785400000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const session = await queryRunner.getTable("session");
        if (session?.findColumnByName("walletNonce")) {
            await queryRunner.query(
                `UPDATE "session" SET "walletNonce" = CAST("id" AS varchar) WHERE "walletNonce" IS NULL AND "dcApiProtocol" = 'iso-18013-7'`,
            );
        } else {
            console.log(
                "[Migration] session.walletNonce not found — skipping.",
            );
        }

        const authSessions = await queryRunner.getTable(
            "interactive_auth_session",
        );
        if (!authSessions) {
            console.log(
                "[Migration] interactive_auth_session table not found — skipping.",
            );
            return;
        }
        if (!authSessions.findColumnByName("presentationSessionId")) {
            await queryRunner.addColumn(
                "interactive_auth_session",
                new TableColumn({
                    name: "presentationSessionId",
                    type: "varchar",
                    isNullable: true,
                }),
            );
            await queryRunner.query(
                `UPDATE "interactive_auth_session" SET "presentationSessionId" = CAST("authSession" AS varchar)`,
            );
            console.log(
                "[Migration] Added presentationSessionId column to interactive_auth_session.",
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const authSessions = await queryRunner.getTable(
            "interactive_auth_session",
        );
        if (authSessions?.findColumnByName("presentationSessionId")) {
            await queryRunner.dropColumn(
                "interactive_auth_session",
                "presentationSessionId",
            );
        }

        const session = await queryRunner.getTable("session");
        if (!session?.findColumnByName("walletNonce")) return;
        await queryRunner.query(
            `UPDATE "session" SET "walletNonce" = NULL WHERE "dcApiProtocol" = 'iso-18013-7' AND "walletNonce" = CAST("id" AS varchar)`,
        );
    }
}
