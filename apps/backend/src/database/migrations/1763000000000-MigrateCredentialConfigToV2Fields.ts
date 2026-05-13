import {
    convertV1ToV2,
    deriveRuntimeArtifacts,
    type CredentialConfigV1,
} from "../../issuer/configuration/credentials/utils";
import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

function parseMaybeJson(value: unknown): any {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch {
            return undefined;
        }
    }
    return value;
}

function toDbJson(value: unknown, isPostgres: boolean): unknown {
    if (value === undefined) {
        return null;
    }
    return isPostgres ? value : JSON.stringify(value);
}

export class MigrateCredentialConfigToV2Fields1763000000000
    implements MigrationInterface
{
    name = "MigrateCredentialConfigToV2Fields1763000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasCredentialConfig =
            await queryRunner.hasTable("credential_config");
        if (!hasCredentialConfig) {
            // Fresh databases may not include issuer tables yet depending on migration ordering.
            console.warn(
                "[Migration] credential_config table not found - skipping MigrateCredentialConfigToV2Fields1763000000000.",
            );
            return;
        }

        const isPostgres = queryRunner.connection.options.type === "postgres";

        await queryRunner.addColumn(
            "credential_config",
            new TableColumn({
                name: "configVersion",
                type: isPostgres ? "integer" : "int",
                default: "2",
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            "credential_config",
            new TableColumn({
                name: "fields",
                type: isPostgres ? "jsonb" : "json",
                isNullable: true,
            }),
        );

        const rows = (await queryRunner.query(
            `SELECT id, "tenantId", description, config, claims, "disclosureFrame", schema, vct, "keyBinding", "keyChainId", "statusManagement", "lifeTime", "iaeActions", "schemaMeta", "embeddedDisclosurePolicy", "attributeProviderId", "webhookEndpointId" FROM credential_config`,
        )) as Array<Record<string, unknown>>;

        for (const row of rows) {
            const v1: CredentialConfigV1 = {
                id: row.id,
                description: row.description,
                config: (parseMaybeJson(row.config) ??
                    {}) as CredentialConfigV1["config"],
                claims: parseMaybeJson(row.claims),
                disclosureFrame: parseMaybeJson(row.disclosureFrame),
                schema: parseMaybeJson(row.schema),
                vct: parseMaybeJson(row.vct) ?? row.vct,
                keyBinding: row.keyBinding,
                keyChainId: row.keyChainId,
                statusManagement: row.statusManagement,
                lifeTime: row.lifeTime,
                iaeActions: parseMaybeJson(row.iaeActions),
                schemaMeta: parseMaybeJson(row.schemaMeta),
                embeddedDisclosurePolicy: parseMaybeJson(
                    row.embeddedDisclosurePolicy,
                ),
                attributeProviderId: row.attributeProviderId,
                webhookEndpointId: row.webhookEndpointId,
            } as CredentialConfigV1;

            const v2 = convertV1ToV2(v1);

            await queryRunner.manager
                .createQueryBuilder()
                .update("credential_config")
                .set({
                    configVersion: 2,
                    fields: toDbJson(v2.fields, isPostgres),
                    config: toDbJson(v2.config, isPostgres),
                })
                .where("id = :id AND tenantId = :tenantId", {
                    id: row.id,
                    tenantId: row.tenantId,
                })
                .execute();
        }

        await queryRunner.dropColumn("credential_config", "claims");
        await queryRunner.dropColumn("credential_config", "disclosureFrame");
        await queryRunner.dropColumn("credential_config", "schema");

        await queryRunner.changeColumn(
            "credential_config",
            "configVersion",
            new TableColumn({
                name: "configVersion",
                type: isPostgres ? "integer" : "int",
                default: "2",
                isNullable: false,
            }),
        );

        await queryRunner.changeColumn(
            "credential_config",
            "fields",
            new TableColumn({
                name: "fields",
                type: isPostgres ? "jsonb" : "json",
                isNullable: false,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasCredentialConfig =
            await queryRunner.hasTable("credential_config");
        if (!hasCredentialConfig) {
            console.warn(
                "[Migration] credential_config table not found - skipping down for MigrateCredentialConfigToV2Fields1763000000000.",
            );
            return;
        }

        const isPostgres = queryRunner.connection.options.type === "postgres";

        await queryRunner.addColumn(
            "credential_config",
            new TableColumn({
                name: "claims",
                type: isPostgres ? "jsonb" : "json",
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            "credential_config",
            new TableColumn({
                name: "disclosureFrame",
                type: isPostgres ? "jsonb" : "json",
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            "credential_config",
            new TableColumn({
                name: "schema",
                type: isPostgres ? "jsonb" : "json",
                isNullable: true,
            }),
        );

        const rows = (await queryRunner.query(
            `SELECT id, "tenantId", config, fields FROM credential_config`,
        )) as Array<Record<string, unknown>>;

        for (const row of rows) {
            const config = (parseMaybeJson(row.config) ?? {}) as Record<
                string,
                unknown
            >;
            const fields = parseMaybeJson(row.fields) as Array<unknown>;
            const runtime = deriveRuntimeArtifacts((fields ?? []) as any);

            const nextConfig: Record<string, unknown> = { ...config };

            if (runtime.claimsMetadata.length > 0) {
                nextConfig.claimsMetadata = runtime.claimsMetadata;
            }

            if (Object.keys(runtime.claimsByNamespace).length > 0) {
                nextConfig.claimsByNamespace = runtime.claimsByNamespace;

                if (
                    nextConfig.format === "mso_mdoc" &&
                    !nextConfig.namespace &&
                    Object.keys(runtime.claimsByNamespace).length === 1
                ) {
                    nextConfig.namespace = Object.keys(
                        runtime.claimsByNamespace,
                    )[0];
                }
            }

            await queryRunner.manager
                .createQueryBuilder()
                .update("credential_config")
                .set({
                    claims: toDbJson(runtime.claims, isPostgres),
                    disclosureFrame: toDbJson(
                        runtime.disclosureFrame,
                        isPostgres,
                    ),
                    schema: toDbJson(runtime.schema, isPostgres),
                    config: toDbJson(nextConfig, isPostgres),
                })
                .where("id = :id AND tenantId = :tenantId", {
                    id: row.id,
                    tenantId: row.tenantId,
                })
                .execute();
        }

        await queryRunner.dropColumn("credential_config", "fields");
        await queryRunner.dropColumn("credential_config", "configVersion");
    }
}
