import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Give existing offer sessions a wallet reference: `walletNonce` = `id`.
 *
 * Issuance sessions now name themselves to wallets with a random
 * `walletNonce` (`credential_offer_uri`, `issuer_state`, external token
 * bindings) and are no longer found by their ID. Offers created before keep
 * working because their wallet reference is the session ID they already
 * carry; for these sessions the ID stays a bearer value until they end.
 * Finished offers are included: external tokens issued for them still
 * correlate by it. Sessions of wallet-initiated authorization requests have
 * no offer (`credentialPayload`), no wallet ever named them by ID, so they
 * stay without one.
 *
 * `down()` clears only the backfilled values: offers created by 10.0 keep
 * their random nonce, and 9.x does not find them by their offer URI.
 */
export class BackfillIssuanceWalletNonce1785300000000
    implements MigrationInterface
{
    name = "BackfillIssuanceWalletNonce1785300000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("session");
        if (!table?.findColumnByName("walletNonce")) {
            console.log(
                "[Migration] session.walletNonce not found — skipping.",
            );
            return;
        }
        await queryRunner.query(
            `UPDATE "session" SET "walletNonce" = CAST("id" AS varchar) WHERE "walletNonce" IS NULL AND "requestId" IS NULL AND "credentialPayload" IS NOT NULL`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("session");
        if (!table?.findColumnByName("walletNonce")) return;
        await queryRunner.query(
            `UPDATE "session" SET "walletNonce" = NULL WHERE "requestId" IS NULL AND "walletNonce" = CAST("id" AS varchar)`,
        );
    }
}
