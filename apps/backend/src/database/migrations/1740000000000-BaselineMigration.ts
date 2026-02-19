import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Baseline Migration - v2.0.0
 *
 * This migration serves as the baseline for the migration system.
 * It handles two scenarios:
 *
 * 1. **New installations**: Creates all tables from scratch.
 * 2. **Existing installations**: The schema was previously managed by TypeORM's
 *    `synchronize: true` option. The tables already exist with the correct schema,
 *    so this migration will detect that and skip table creation.
 *
 * This approach allows existing deployments to upgrade smoothly without
 * breaking their databases.
 */
export class BaselineMigration1740000000000 implements MigrationInterface {
    name = "BaselineMigration1740000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const isPostgres = queryRunner.connection.options.type === "postgres";

        // Check if the tenant_entity table exists (as a proxy for "database already initialized")
        const tableExists = await this.tableExists(
            queryRunner,
            "tenant_entity",
        );

        if (tableExists) {
            // Existing installation - schema already matches entities
            // Log and skip creation
            console.log(
                "[Migration] Existing database detected. Schema already up-to-date from synchronize mode.",
            );
            console.log(
                "[Migration] Skipping table creation - marking baseline as complete.",
            );
            return;
        }

        // New installation - create all tables
        console.log(
            "[Migration] Fresh database detected. Creating schema from baseline.",
        );

        if (isPostgres) {
            await this.createPostgresSchema(queryRunner);
        } else {
            await this.createSqliteSchema(queryRunner);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverting the baseline migration would drop all tables
        // This is intentionally not implemented to prevent accidental data loss
        console.log(
            "[Migration] Reverting baseline migration is not supported to prevent data loss.",
        );
        console.log(
            "[Migration] To reset the database, drop all tables manually.",
        );
    }

    private async tableExists(
        queryRunner: QueryRunner,
        tableName: string,
    ): Promise<boolean> {
        const tables = await queryRunner.getTables([tableName]);
        return tables.length > 0;
    }

    private async createPostgresSchema(
        queryRunner: QueryRunner,
    ): Promise<void> {
        // TenantEntity
        await queryRunner.query(`
            CREATE TABLE "tenant_entity" (
                "id" varchar NOT NULL,
                "name" varchar NOT NULL DEFAULT 'EUDIPLO',
                "description" varchar,
                "status" varchar,
                "sessionConfig" json,
                "statusListConfig" json,
                CONSTRAINT "PK_tenant_entity" PRIMARY KEY ("id")
            )
        `);

        // ClientEntity
        await queryRunner.query(`
            CREATE TABLE "client_entity" (
                "clientId" varchar NOT NULL,
                "secret" varchar,
                "tenantId" varchar,
                "description" varchar,
                "roles" json NOT NULL,
                "allowedPresentationConfigs" json,
                "allowedIssuanceConfigs" json,
                CONSTRAINT "PK_client_entity" PRIMARY KEY ("clientId"),
                CONSTRAINT "FK_client_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // KeyEntity
        await queryRunner.query(`
            CREATE TABLE "key_entity" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "description" varchar,
                "kid" varchar,
                "alg" varchar,
                "usage" varchar,
                "kmsKeyId" varchar,
                "key" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_key_entity" PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_key_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // CertEntity
        await queryRunner.query(`
            CREATE TABLE "cert_entity" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "description" varchar,
                "keyId" varchar NOT NULL,
                "certificate" text NOT NULL,
                "chain" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cert_entity" PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_cert_key" FOREIGN KEY ("keyId", "tenantId") REFERENCES "key_entity"("id", "tenantId") ON DELETE CASCADE
            )
        `);

        // CertUsageEntity
        await queryRunner.query(`
            CREATE TABLE "cert_usage_entity" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "certId" varchar NOT NULL,
                "usage" varchar NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cert_usage_entity" PRIMARY KEY ("id"),
                CONSTRAINT "FK_cert_usage_cert" FOREIGN KEY ("certId", "tenantId") REFERENCES "cert_entity"("id", "tenantId") ON DELETE CASCADE
            )
        `);

        // Session
        await queryRunner.query(`
            CREATE TABLE "session" (
                "id" uuid NOT NULL,
                "tenantId" varchar NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "expiresAt" date,
                "useDcApi" boolean,
                "status" varchar NOT NULL DEFAULT 'active',
                "type" varchar NOT NULL,
                "authorizationCode" varchar,
                "accessToken" varchar,
                "requestUri" varchar,
                "responseUri" varchar,
                "authorizeQueries" json,
                "presentation" json,
                "disclosedCredentials" text,
                "cNonce" varchar,
                "credentials" json,
                "credentialOffer" json,
                "credentialOfferUri" varchar,
                "webhookConfig" json,
                "issuedCredentialIds" json,
                "notifications" json,
                "issuanceAttempts" integer,
                "requestPayload" json,
                "issuanceConfig" json,
                "transactionData" json,
                "openidPresentationData" json,
                "verifiedPresentationResult" text,
                CONSTRAINT "PK_session" PRIMARY KEY ("id"),
                CONSTRAINT "FK_session_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // IssuanceConfig
        await queryRunner.query(`
            CREATE TABLE "issuance_config" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "description" varchar,
                "credentialIssuer" varchar NOT NULL,
                "authorizationServer" varchar,
                "metaData" json,
                "display" json,
                "dpopRequired" boolean DEFAULT false,
                "chainedAsConfig" json,
                "authenticationConfig" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_issuance_config" PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_issuance_config_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // CredentialConfig
        await queryRunner.query(`
            CREATE TABLE "credential_config" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "description" varchar,
                "issuanceConfigId" varchar NOT NULL,
                "config" json NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_credential_config" PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_credential_config_issuance" FOREIGN KEY ("issuanceConfigId", "tenantId") REFERENCES "issuance_config"("id", "tenantId") ON DELETE CASCADE
            )
        `);

        // StatusListEntity
        await queryRunner.query(`
            CREATE TABLE "status_list_entity" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "bitsPerStatus" integer NOT NULL DEFAULT 1,
                "statusList" text NOT NULL,
                "statusMessages" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_status_list_entity" PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_status_list_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // StatusMappingEntity
        await queryRunner.query(`
            CREATE TABLE "status_mapping_entity" (
                "credentialId" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "statusListId" varchar NOT NULL,
                "index" integer NOT NULL,
                "purpose" varchar NOT NULL DEFAULT 'revocation',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_status_mapping_entity" PRIMARY KEY ("credentialId", "tenantId"),
                CONSTRAINT "FK_status_mapping_status_list" FOREIGN KEY ("statusListId", "tenantId") REFERENCES "status_list_entity"("id", "tenantId") ON DELETE CASCADE
            )
        `);

        // PresentationConfig
        await queryRunner.query(`
            CREATE TABLE "presentation_config" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "description" varchar,
                "presentation_definition" json,
                "dcql" json,
                "jwksUri" varchar,
                "clientId" varchar,
                "clientIdScheme" varchar DEFAULT 'redirect_uri',
                "presentationPolicy" json,
                "transactionData" json,
                "responseModeSupported" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_presentation_config" PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_presentation_config_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // NonceEntity
        await queryRunner.query(`
            CREATE TABLE "nonce_entity" (
                "nonce" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "expiresAt" TIMESTAMP,
                CONSTRAINT "PK_nonce_entity" PRIMARY KEY ("nonce", "tenantId")
            )
        `);

        // InteractiveAuthSessionEntity
        await queryRunner.query(`
            CREATE TABLE "interactive_auth_session_entity" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "issuanceConfigId" varchar NOT NULL,
                "sessionId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "expiresAt" TIMESTAMP,
                "state" varchar,
                "codeVerifier" varchar,
                CONSTRAINT "PK_interactive_auth_session_entity" PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_interactive_auth_session_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // DeferredTransactionEntity
        await queryRunner.query(`
            CREATE TABLE "deferred_transaction_entity" (
                "transactionId" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "credentialConfigurationId" varchar NOT NULL,
                "accessToken" varchar NOT NULL,
                "cNonce" varchar,
                "credentialSubject" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "expiresAt" TIMESTAMP,
                "proofPublicKey" json,
                CONSTRAINT "PK_deferred_transaction_entity" PRIMARY KEY ("transactionId", "tenantId"),
                CONSTRAINT "FK_deferred_transaction_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // ChainedAsSessionEntity
        await queryRunner.query(`
            CREATE TABLE "chained_as_session_entity" (
                "requestUri" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "issuanceConfigId" varchar NOT NULL,
                "sessionId" uuid NOT NULL,
                "credentialConfigurationIds" json,
                "authorizationDetails" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "expiresAt" TIMESTAMP,
                CONSTRAINT "PK_chained_as_session_entity" PRIMARY KEY ("requestUri", "tenantId"),
                CONSTRAINT "FK_chained_as_session_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // TrustList
        await queryRunner.query(`
            CREATE TABLE "trust_list" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "description" varchar,
                "keyId" varchar NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_trust_list" PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_trust_list_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // TrustListVersion
        await queryRunner.query(`
            CREATE TABLE "trust_list_version" (
                "version" integer NOT NULL,
                "tenantId" varchar NOT NULL,
                "trustListId" varchar NOT NULL,
                "trustList" text NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_trust_list_version" PRIMARY KEY ("version", "trustListId", "tenantId"),
                CONSTRAINT "FK_trust_list_version_trust_list" FOREIGN KEY ("trustListId", "tenantId") REFERENCES "trust_list"("id", "tenantId") ON DELETE CASCADE
            )
        `);

        // RegistrarConfigEntity
        await queryRunner.query(`
            CREATE TABLE "registrar_config_entity" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "description" varchar,
                "baseUrl" varchar NOT NULL,
                "clientId" varchar NOT NULL,
                "clientSecret" varchar,
                "keyId" varchar NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_registrar_config_entity" PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_registrar_config_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // FileEntity
        await queryRunner.query(`
            CREATE TABLE "file_entity" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "filename" varchar NOT NULL,
                "mimeType" varchar NOT NULL,
                "path" varchar NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_file_entity" PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_file_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // Create indices for common queries
        await queryRunner.query(
            `CREATE INDEX "IDX_session_tenantId" ON "session" ("tenantId")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_session_status" ON "session" ("status")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_key_tenantId" ON "key_entity" ("tenantId")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_credential_config_tenantId" ON "credential_config" ("tenantId")`,
        );
    }

    private async createSqliteSchema(queryRunner: QueryRunner): Promise<void> {
        // TenantEntity
        await queryRunner.query(`
            CREATE TABLE "tenant_entity" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar NOT NULL DEFAULT 'EUDIPLO',
                "description" varchar,
                "status" varchar,
                "sessionConfig" text,
                "statusListConfig" text
            )
        `);

        // ClientEntity
        await queryRunner.query(`
            CREATE TABLE "client_entity" (
                "clientId" varchar PRIMARY KEY NOT NULL,
                "secret" varchar,
                "tenantId" varchar,
                "description" varchar,
                "roles" text NOT NULL,
                "allowedPresentationConfigs" text,
                "allowedIssuanceConfigs" text,
                CONSTRAINT "FK_client_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // KeyEntity
        await queryRunner.query(`
            CREATE TABLE "key_entity" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "description" varchar,
                "kid" varchar,
                "alg" varchar,
                "usage" varchar,
                "kmsKeyId" varchar,
                "key" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_key_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // CertEntity
        await queryRunner.query(`
            CREATE TABLE "cert_entity" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "description" varchar,
                "keyId" varchar NOT NULL,
                "certificate" text NOT NULL,
                "chain" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_cert_key" FOREIGN KEY ("keyId", "tenantId") REFERENCES "key_entity"("id", "tenantId") ON DELETE CASCADE
            )
        `);

        // CertUsageEntity
        await queryRunner.query(`
            CREATE TABLE "cert_usage_entity" (
                "id" varchar PRIMARY KEY NOT NULL,
                "tenantId" varchar NOT NULL,
                "certId" varchar NOT NULL,
                "usage" varchar NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "FK_cert_usage_cert" FOREIGN KEY ("certId", "tenantId") REFERENCES "cert_entity"("id", "tenantId") ON DELETE CASCADE
            )
        `);

        // Session
        await queryRunner.query(`
            CREATE TABLE "session" (
                "id" varchar PRIMARY KEY NOT NULL,
                "tenantId" varchar NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "expiresAt" date,
                "useDcApi" boolean,
                "status" varchar NOT NULL DEFAULT 'active',
                "type" varchar NOT NULL,
                "authorizationCode" varchar,
                "accessToken" varchar,
                "requestUri" varchar,
                "responseUri" varchar,
                "authorizeQueries" text,
                "presentation" text,
                "disclosedCredentials" text,
                "cNonce" varchar,
                "credentials" text,
                "credentialOffer" text,
                "credentialOfferUri" varchar,
                "webhookConfig" text,
                "issuedCredentialIds" text,
                "notifications" text,
                "issuanceAttempts" integer,
                "requestPayload" text,
                "issuanceConfig" text,
                "transactionData" text,
                "openidPresentationData" text,
                "verifiedPresentationResult" text,
                CONSTRAINT "FK_session_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // IssuanceConfig
        await queryRunner.query(`
            CREATE TABLE "issuance_config" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "description" varchar,
                "credentialIssuer" varchar NOT NULL,
                "authorizationServer" varchar,
                "metaData" text,
                "display" text,
                "dpopRequired" boolean DEFAULT 0,
                "chainedAsConfig" text,
                "authenticationConfig" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_issuance_config_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // CredentialConfig
        await queryRunner.query(`
            CREATE TABLE "credential_config" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "description" varchar,
                "issuanceConfigId" varchar NOT NULL,
                "config" text NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_credential_config_issuance" FOREIGN KEY ("issuanceConfigId", "tenantId") REFERENCES "issuance_config"("id", "tenantId") ON DELETE CASCADE
            )
        `);

        // StatusListEntity
        await queryRunner.query(`
            CREATE TABLE "status_list_entity" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "bitsPerStatus" integer NOT NULL DEFAULT 1,
                "statusList" text NOT NULL,
                "statusMessages" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_status_list_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // StatusMappingEntity
        await queryRunner.query(`
            CREATE TABLE "status_mapping_entity" (
                "credentialId" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "statusListId" varchar NOT NULL,
                "index" integer NOT NULL,
                "purpose" varchar NOT NULL DEFAULT 'revocation',
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY ("credentialId", "tenantId"),
                CONSTRAINT "FK_status_mapping_status_list" FOREIGN KEY ("statusListId", "tenantId") REFERENCES "status_list_entity"("id", "tenantId") ON DELETE CASCADE
            )
        `);

        // PresentationConfig
        await queryRunner.query(`
            CREATE TABLE "presentation_config" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "description" varchar,
                "presentation_definition" text,
                "dcql" text,
                "jwksUri" varchar,
                "clientId" varchar,
                "clientIdScheme" varchar DEFAULT 'redirect_uri',
                "presentationPolicy" text,
                "transactionData" text,
                "responseModeSupported" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_presentation_config_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // NonceEntity
        await queryRunner.query(`
            CREATE TABLE "nonce_entity" (
                "nonce" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "expiresAt" datetime,
                PRIMARY KEY ("nonce", "tenantId")
            )
        `);

        // InteractiveAuthSessionEntity
        await queryRunner.query(`
            CREATE TABLE "interactive_auth_session_entity" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "issuanceConfigId" varchar NOT NULL,
                "sessionId" varchar NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "expiresAt" datetime,
                "state" varchar,
                "codeVerifier" varchar,
                PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_interactive_auth_session_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // DeferredTransactionEntity
        await queryRunner.query(`
            CREATE TABLE "deferred_transaction_entity" (
                "transactionId" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "credentialConfigurationId" varchar NOT NULL,
                "accessToken" varchar NOT NULL,
                "cNonce" varchar,
                "credentialSubject" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "expiresAt" datetime,
                "proofPublicKey" text,
                PRIMARY KEY ("transactionId", "tenantId"),
                CONSTRAINT "FK_deferred_transaction_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // ChainedAsSessionEntity
        await queryRunner.query(`
            CREATE TABLE "chained_as_session_entity" (
                "requestUri" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "issuanceConfigId" varchar NOT NULL,
                "sessionId" varchar NOT NULL,
                "credentialConfigurationIds" text,
                "authorizationDetails" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "expiresAt" datetime,
                PRIMARY KEY ("requestUri", "tenantId"),
                CONSTRAINT "FK_chained_as_session_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // TrustList
        await queryRunner.query(`
            CREATE TABLE "trust_list" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "description" varchar,
                "keyId" varchar NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_trust_list_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // TrustListVersion
        await queryRunner.query(`
            CREATE TABLE "trust_list_version" (
                "version" integer NOT NULL,
                "tenantId" varchar NOT NULL,
                "trustListId" varchar NOT NULL,
                "trustList" text NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY ("version", "trustListId", "tenantId"),
                CONSTRAINT "FK_trust_list_version_trust_list" FOREIGN KEY ("trustListId", "tenantId") REFERENCES "trust_list"("id", "tenantId") ON DELETE CASCADE
            )
        `);

        // RegistrarConfigEntity
        await queryRunner.query(`
            CREATE TABLE "registrar_config_entity" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "description" varchar,
                "baseUrl" varchar NOT NULL,
                "clientId" varchar NOT NULL,
                "clientSecret" varchar,
                "keyId" varchar NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_registrar_config_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // FileEntity
        await queryRunner.query(`
            CREATE TABLE "file_entity" (
                "id" varchar NOT NULL,
                "tenantId" varchar NOT NULL,
                "filename" varchar NOT NULL,
                "mimeType" varchar NOT NULL,
                "path" varchar NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY ("id", "tenantId"),
                CONSTRAINT "FK_file_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant_entity"("id") ON DELETE CASCADE
            )
        `);

        // Create indices for common queries
        await queryRunner.query(
            `CREATE INDEX "IDX_session_tenantId" ON "session" ("tenantId")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_session_status" ON "session" ("status")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_key_tenantId" ON "key_entity" ("tenantId")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_credential_config_tenantId" ON "credential_config" ("tenantId")`,
        );
    }
}
