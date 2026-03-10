import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration to rename usage type from "signing" to "attestation".
 */
export class RenameSigningToAttestation1745000000000
    implements MigrationInterface
{
    name = "RenameSigningToAttestation1745000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update key_usage_entity usage column from 'signing' to 'attestation'
        await queryRunner.query(
            `UPDATE "key_usage_entity" SET "usage" = 'attestation' WHERE "usage" = 'signing'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert: update key_usage_entity usage column from 'attestation' to 'signing'
        await queryRunner.query(
            `UPDATE "key_usage_entity" SET "usage" = 'signing' WHERE "usage" = 'attestation'`,
        );
    }
}
