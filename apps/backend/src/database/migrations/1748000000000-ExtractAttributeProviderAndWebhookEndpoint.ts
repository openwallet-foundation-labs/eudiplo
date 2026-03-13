import { MigrationInterface, QueryRunner, Table, TableColumn } from "typeorm";

/**
 * Migration to extract embedded webhook JSON blobs from CredentialConfig
 * into two new first-class entities: AttributeProvider and WebhookEndpoint.
 *
 * This migration:
 * 1. Creates the attribute_provider_entity table
 * 2. Creates the webhook_endpoint_entity table
 * 3. Adds attributeProviderId and webhookEndpointId columns to credential_config
 * 4. Migrates existing claimsWebhook data into attribute_provider_entity rows
 * 5. Drops the old claimsWebhook and notificationWebhook columns from credential_config
 * 6. Replaces notifyWebhook (json) on session with webhookEndpointId (varchar)
 */
export class ExtractAttributeProviderAndWebhookEndpoint1748000000000
    implements MigrationInterface
{
    name = "ExtractAttributeProviderAndWebhookEndpoint1748000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const credentialConfigTable =
            await queryRunner.getTable("credential_config");
        if (!credentialConfigTable) {
            console.log(
                "[Migration] credential_config table not found — skipping (schema may not exist yet).",
            );
            return;
        }

        // 1. Create attribute_provider_entity table
        const apTable = await queryRunner.getTable("attribute_provider_entity");
        if (!apTable) {
            await queryRunner.createTable(
                new Table({
                    name: "attribute_provider_entity",
                    columns: [
                        {
                            name: "id",
                            type: "varchar",
                            isPrimary: true,
                        },
                        {
                            name: "tenantId",
                            type: "varchar",
                            isPrimary: true,
                        },
                        {
                            name: "name",
                            type: "varchar",
                        },
                        {
                            name: "description",
                            type: "varchar",
                            isNullable: true,
                        },
                        {
                            name: "url",
                            type: "varchar",
                        },
                        {
                            name: "auth",
                            type: "json",
                        },
                    ],
                }),
                true,
            );
        }

        // 2. Create webhook_endpoint_entity table
        const weTable = await queryRunner.getTable("webhook_endpoint_entity");
        if (!weTable) {
            await queryRunner.createTable(
                new Table({
                    name: "webhook_endpoint_entity",
                    columns: [
                        {
                            name: "id",
                            type: "varchar",
                            isPrimary: true,
                        },
                        {
                            name: "tenantId",
                            type: "varchar",
                            isPrimary: true,
                        },
                        {
                            name: "name",
                            type: "varchar",
                        },
                        {
                            name: "description",
                            type: "varchar",
                            isNullable: true,
                        },
                        {
                            name: "url",
                            type: "varchar",
                        },
                        {
                            name: "auth",
                            type: "json",
                        },
                    ],
                }),
                true,
            );
        }

        // 3. Add new FK columns to credential_config
        const hasAttributeProviderId = credentialConfigTable.columns.some(
            (c) => c.name === "attributeProviderId",
        );
        if (!hasAttributeProviderId) {
            await queryRunner.addColumn(
                "credential_config",
                new TableColumn({
                    name: "attributeProviderId",
                    type: "varchar",
                    isNullable: true,
                }),
            );
        }

        const hasWebhookEndpointId = credentialConfigTable.columns.some(
            (c) => c.name === "webhookEndpointId",
        );
        if (!hasWebhookEndpointId) {
            await queryRunner.addColumn(
                "credential_config",
                new TableColumn({
                    name: "webhookEndpointId",
                    type: "varchar",
                    isNullable: true,
                }),
            );
        }

        // 4. Migrate existing claimsWebhook data
        const hasClaimsWebhook = credentialConfigTable.columns.some(
            (c) => c.name === "claimsWebhook",
        );
        if (hasClaimsWebhook) {
            // Read existing rows with claimsWebhook data
            const rows: Array<{
                id: string;
                tenantId: string;
                claimsWebhook: string | null;
            }> = await queryRunner.query(
                `SELECT "id", "tenantId", "claimsWebhook" FROM "credential_config" WHERE "claimsWebhook" IS NOT NULL`,
            );

            for (const row of rows) {
                const webhook =
                    typeof row.claimsWebhook === "string"
                        ? JSON.parse(row.claimsWebhook)
                        : row.claimsWebhook;
                if (!webhook?.url) continue;

                const apId = `ap-migrated-${row.id}`;
                // Insert into attribute_provider_entity
                await queryRunner.query(
                    `INSERT INTO "attribute_provider_entity" ("id", "tenantId", "name", "url", "auth") VALUES (?, ?, ?, ?, ?)`,
                    [
                        apId,
                        row.tenantId,
                        `Migrated from ${row.id}`,
                        webhook.url,
                        JSON.stringify(webhook.auth ?? { type: "none" }),
                    ],
                );
                // Update credential_config to reference the new attribute provider
                await queryRunner.query(
                    `UPDATE "credential_config" SET "attributeProviderId" = ? WHERE "id" = ? AND "tenantId" = ?`,
                    [apId, row.id, row.tenantId],
                );
            }

            // 5. Drop old columns
            await queryRunner.dropColumn("credential_config", "claimsWebhook");
        }

        const hasNotificationWebhook = credentialConfigTable.columns.some(
            (c) => c.name === "notificationWebhook",
        );
        if (hasNotificationWebhook) {
            await queryRunner.dropColumn(
                "credential_config",
                "notificationWebhook",
            );
        }

        // 6. Handle session table: replace notifyWebhook (json) with webhookEndpointId (varchar)
        const sessionTable = await queryRunner.getTable("session");
        if (sessionTable) {
            const hasNotifyWebhook = sessionTable.columns.some(
                (c) => c.name === "notifyWebhook",
            );
            if (hasNotifyWebhook) {
                await queryRunner.dropColumn("session", "notifyWebhook");
            }

            const hasSessionWebhookEndpointId = sessionTable.columns.some(
                (c) => c.name === "webhookEndpointId",
            );
            if (!hasSessionWebhookEndpointId) {
                await queryRunner.addColumn(
                    "session",
                    new TableColumn({
                        name: "webhookEndpointId",
                        type: "varchar",
                        isNullable: true,
                    }),
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore session.notifyWebhook
        const sessionTable = await queryRunner.getTable("session");
        if (sessionTable) {
            const hasWebhookEndpointId = sessionTable.columns.some(
                (c) => c.name === "webhookEndpointId",
            );
            if (hasWebhookEndpointId) {
                await queryRunner.dropColumn("session", "webhookEndpointId");
            }
            await queryRunner.addColumn(
                "session",
                new TableColumn({
                    name: "notifyWebhook",
                    type: "json",
                    isNullable: true,
                }),
            );
        }

        // Restore credential_config columns
        const credentialConfigTable =
            await queryRunner.getTable("credential_config");
        if (credentialConfigTable) {
            await queryRunner.addColumn(
                "credential_config",
                new TableColumn({
                    name: "claimsWebhook",
                    type: "json",
                    isNullable: true,
                }),
            );
            await queryRunner.addColumn(
                "credential_config",
                new TableColumn({
                    name: "notificationWebhook",
                    type: "json",
                    isNullable: true,
                }),
            );

            const hasAttributeProviderId = credentialConfigTable.columns.some(
                (c) => c.name === "attributeProviderId",
            );
            if (hasAttributeProviderId) {
                await queryRunner.dropColumn(
                    "credential_config",
                    "attributeProviderId",
                );
            }
            const hasWebhookEndpointId = credentialConfigTable.columns.some(
                (c) => c.name === "webhookEndpointId",
            );
            if (hasWebhookEndpointId) {
                await queryRunner.dropColumn(
                    "credential_config",
                    "webhookEndpointId",
                );
            }
        }

        // Drop new tables
        await queryRunner.dropTable("webhook_endpoint_entity", true);
        await queryRunner.dropTable("attribute_provider_entity", true);
    }
}
