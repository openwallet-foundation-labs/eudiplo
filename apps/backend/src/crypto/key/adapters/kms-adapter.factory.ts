import { HttpService } from "@nestjs/axios";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { CryptoImplementationService } from "../crypto-implementation/crypto-implementation.service";
import { KeyEntity } from "../entities/keys.entity";
import { KmsAdapter } from "../kms-adapter";
import { AwsKmsKeyService } from "./aws-kms-key.service";
import { DBKeyService } from "./db-key.service";
import { VaultKeyService } from "./vault-key.service";

/**
 * Dependencies needed to construct any KMS adapter.
 * Passed in from the KeyModule factory.
 */
export interface KmsAdapterDeps {
    configService: ConfigService;
    httpService: HttpService;
    cryptoService: CryptoImplementationService;
    keyRepository: Repository<KeyEntity>;
}

/**
 * A function that creates a KmsAdapter from provider-specific config + shared dependencies.
 */
type KmsAdapterFactoryFn = (
    config: Record<string, unknown>,
    deps: KmsAdapterDeps,
) => KmsAdapter;

/**
 * Supported KMS adapter type names.
 * When adding a new adapter, add its type here and register its factory below.
 */
export const KMS_ADAPTER_TYPES = ["db", "vault", "aws-kms"] as const;
export type KmsAdapterType = (typeof KMS_ADAPTER_TYPES)[number];

/**
 * Registry of adapter factory functions, keyed by the provider type used in kms.json.
 *
 * To add a new KMS adapter:
 * 1. Create a class extending KmsAdapter in /adapters/
 * 2. Add the type name to KMS_ADAPTER_TYPES above
 * 3. Create a typed config DTO in dto/kms-config.dto.ts extending BaseKmsProviderConfigDto
 * 4. Register a factory function here under that type name
 * 5. Add the provider entry in kms.json with id, type, and description
 */
const ADAPTER_FACTORIES: Record<string, KmsAdapterFactoryFn> = {
    db: (_config, deps) =>
        new DBKeyService(deps.cryptoService, deps.keyRepository),

    vault: (config, deps) => {
        const vaultUrl = config.vaultUrl as string;
        const vaultToken = config.vaultToken as string;

        if (!vaultUrl || !vaultToken) {
            throw new Error(
                'Vault KMS provider requires "vaultUrl" and "vaultToken" in kms.json.',
            );
        }

        return new VaultKeyService(
            deps.httpService,
            vaultUrl,
            vaultToken,
            deps.cryptoService,
            deps.keyRepository,
        );
    },

    "aws-kms": (config, deps) => {
        const region = config.region as string;

        if (!region) {
            throw new Error('AWS KMS provider requires "region" in kms.json.');
        }

        const accessKeyId = config.accessKeyId as string | undefined;
        const secretAccessKey = config.secretAccessKey as string | undefined;

        return new AwsKmsKeyService(
            deps.cryptoService,
            deps.keyRepository,
            region,
            accessKeyId,
            secretAccessKey,
        );
    },
};

const logger = new Logger("KmsAdapterFactory");

/**
 * Create a KeyService adapter instance from a kms.json provider entry.
 *
 * @param type - The provider type (key from the providers object, e.g., "db", "vault")
 * @param config - The provider-specific config object
 * @param deps - Shared NestJS dependencies
 * @throws Error if the adapter type is not registered
 */
export function createKmsAdapter(
    type: string,
    config: Record<string, unknown>,
    deps: KmsAdapterDeps,
): KmsAdapter {
    const factory = ADAPTER_FACTORIES[type];
    if (!factory) {
        throw new Error(
            `Unknown KMS adapter type "${type}". ` +
                `Supported types: ${Object.keys(ADAPTER_FACTORIES).join(", ")}`,
        );
    }
    logger.log(`Creating KMS adapter: ${type}`);
    return factory(config, deps);
}
