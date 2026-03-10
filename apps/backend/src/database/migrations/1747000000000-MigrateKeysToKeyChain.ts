import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: Migrate legacy key_entity + cert_entity data to key_chain table.
 *
 * This is a BREAKING CHANGE migration for the major release.
 *
 * The migration:
 * 1. Copies key data from key_entity to key_chain
 * 2. Joins the active certificate from cert_entity
 * 3. Drops the legacy tables (key_entity, cert_entity, key_usage_entity, cert_usage_entity)
 *
 * Note: Keys with a signingCaKeyId (CA-signed) will have the CA embedded as rootKey/rootCertificate
 * if the CA key exists. Otherwise, they become standalone self-signed keys.
 */
export class MigrateKeysToKeyChain1747000000000 implements MigrationInterface {
    name = "MigrateKeysToKeyChain1747000000000";

    private async tableExists(
        queryRunner: QueryRunner,
        tableName: string,
    ): Promise<boolean> {
        const result = await queryRunner.query(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
            [tableName],
        );
        return result.length > 0;
    }

    async up(queryRunner: QueryRunner): Promise<void> {
        // Check if key_entity table exists (might be a fresh install)
        const keyEntityExists = await this.tableExists(
            queryRunner,
            "key_entity",
        );

        if (!keyEntityExists) {
            console.log(
                "[Migration] MigrateKeysToKeyChain: key_entity table not found — skipping (fresh install).",
            );
            return;
        }

        // Check if key_chain table exists (should be created by entity sync)
        const keyChainExists = await this.tableExists(queryRunner, "key_chain");
        if (!keyChainExists) {
            console.log(
                "[Migration] MigrateKeysToKeyChain: key_chain table not found — entity sync should create it.",
            );
            // The entity should create the table, but if running migration standalone, we'd need to create it.
            // For now, we assume TypeORM sync has run or will run.
            return;
        }

        // Fetch all keys that have a usageType (signing keys, not standalone CA keys)
        const keys = await queryRunner.query(`
            SELECT 
                k.id,
                k.tenantId,
                k.description,
                k.usageType,
                k.usage,
                k.kmsProvider,
                k.externalKeyId,
                k.signingCaKeyId,
                k.rotationEnabled,
                k.rotationIntervalDays,
                k.certValidityDays,
                k.lastRotatedAt,
                k.createdAt,
                k.updatedAt,
                k.key
            FROM key_entity k
            WHERE k.usageType IS NOT NULL
        `);

        console.log(
            `[Migration] MigrateKeysToKeyChain: Found ${keys.length} keys to migrate.`,
        );

        for (const key of keys) {
            // Find the active certificate for this key
            const certs = await queryRunner.query(
                `
                SELECT c.id, c.crt, c.description, c.signingCaKeyId
                FROM cert_entity c
                WHERE c.keyId = ? AND c.tenantId = ?
                ORDER BY c.createdAt DESC
                LIMIT 1
            `,
                [key.id, key.tenantId],
            );

            const cert = certs[0];
            if (!cert) {
                console.log(
                    `[Migration] Warning: No certificate found for key ${key.id}, skipping.`,
                );
                continue;
            }

            // Parse the certificate chain (stored as JSON array of PEM strings)
            let activeCertificate: string;
            try {
                const certChain = JSON.parse(cert.crt);
                activeCertificate = Array.isArray(certChain)
                    ? certChain[0]
                    : certChain;
            } catch {
                activeCertificate = cert.crt;
            }

            // Check if this key has a CA that signs it
            let rootKey: string | null = null;
            let rootCertificate: string | null = null;

            if (key.signingCaKeyId) {
                // Fetch the CA key
                const caKeys = await queryRunner.query(
                    `
                    SELECT k.key, k.id
                    FROM key_entity k
                    WHERE k.id = ? AND k.tenantId = ?
                `,
                    [key.signingCaKeyId, key.tenantId],
                );

                if (caKeys.length > 0) {
                    rootKey = caKeys[0].key;

                    // Fetch the CA certificate
                    const caCerts = await queryRunner.query(
                        `
                        SELECT c.crt
                        FROM cert_entity c
                        WHERE c.keyId = ? AND c.tenantId = ?
                        ORDER BY c.createdAt DESC
                        LIMIT 1
                    `,
                        [key.signingCaKeyId, key.tenantId],
                    );

                    if (caCerts.length > 0) {
                        try {
                            const caCertChain = JSON.parse(caCerts[0].crt);
                            rootCertificate = Array.isArray(caCertChain)
                                ? caCertChain[0]
                                : caCertChain;
                        } catch {
                            rootCertificate = caCerts[0].crt;
                        }
                    }
                }
            }

            // Check if key_chain entry already exists
            const existingKeyChain = await queryRunner.query(
                `SELECT id FROM key_chain WHERE id = ? AND tenantId = ?`,
                [key.id, key.tenantId],
            );

            if (existingKeyChain.length > 0) {
                console.log(
                    `[Migration] Key chain ${key.id} already exists, skipping.`,
                );
                continue;
            }

            // Insert into key_chain
            await queryRunner.query(
                `
                INSERT INTO key_chain (
                    id,
                    tenantId,
                    description,
                    usageType,
                    usage,
                    kmsProvider,
                    externalKeyId,
                    rootKey,
                    rootCertificate,
                    activeKey,
                    activeCertificate,
                    rotationEnabled,
                    rotationIntervalDays,
                    certValidityDays,
                    lastRotatedAt,
                    previousKey,
                    previousCertificate,
                    previousKeyExpiry,
                    createdAt,
                    updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                [
                    key.id,
                    key.tenantId,
                    key.description,
                    key.usageType,
                    key.usage || "sign",
                    key.kmsProvider || "db",
                    key.externalKeyId,
                    rootKey,
                    rootCertificate,
                    key.key,
                    activeCertificate,
                    key.rotationEnabled ? 1 : 0,
                    key.rotationIntervalDays,
                    key.certValidityDays,
                    key.lastRotatedAt,
                    null, // previousKey
                    null, // previousCertificate
                    null, // previousKeyExpiry
                    key.createdAt,
                    key.updatedAt,
                ],
            );

            console.log(
                `[Migration] Migrated key ${key.id} (${key.usageType}) to key_chain.`,
            );
        }

        // Drop legacy tables
        console.log("[Migration] Dropping legacy tables...");

        // Drop foreign key dependent tables first
        if (await this.tableExists(queryRunner, "cert_usage_entity")) {
            await queryRunner.query(`DROP TABLE cert_usage_entity`);
            console.log("[Migration] Dropped cert_usage_entity table.");
        }

        if (await this.tableExists(queryRunner, "key_usage_entity")) {
            await queryRunner.query(`DROP TABLE key_usage_entity`);
            console.log("[Migration] Dropped key_usage_entity table.");
        }

        if (await this.tableExists(queryRunner, "cert_entity")) {
            await queryRunner.query(`DROP TABLE cert_entity`);
            console.log("[Migration] Dropped cert_entity table.");
        }

        if (await this.tableExists(queryRunner, "key_entity")) {
            await queryRunner.query(`DROP TABLE key_entity`);
            console.log("[Migration] Dropped key_entity table.");
        }

        console.log("[Migration] MigrateKeysToKeyChain complete.");
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        // This is a one-way migration for a major release.
        // Rolling back would require recreating the legacy tables and reverse-migrating data.
        console.log(
            "[Migration] MigrateKeysToKeyChain down: This migration cannot be reversed automatically.",
        );
        console.log(
            "[Migration] To rollback, restore from a backup taken before the migration.",
        );
    }
}
