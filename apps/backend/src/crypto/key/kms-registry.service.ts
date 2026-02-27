import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { HttpService } from "@nestjs/axios";
import {
    Injectable,
    Logger,
    NotFoundException,
    OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { validateSync } from "class-validator";
import { Repository } from "typeorm";
import {
    createKmsAdapter,
    type KmsAdapterDeps,
} from "./adapters/kms-adapter.factory";
import { CryptoImplementationService } from "./crypto-implementation/crypto-implementation.service";
import { KmsConfigDto } from "./dto/kms-config.dto";
import { KeyEntity } from "./entities/keys.entity";
import { KmsAdapter } from "./kms-adapter";

/**
 * KmsRegistry holds all configured KMS providers and resolves the correct one per key.
 *
 * Providers are loaded from `kms.json` in the config folder at startup.
 * If no config file exists, a default "db" provider is registered automatically.
 *
 * The config file lives at `<CONFIG_FOLDER>/kms.json` (global, not per-tenant).
 *
 * Example kms.json:
 * ```json
 * {
 *   "defaultProvider": "db",
 *   "providers": {
 *     "db": {},
 *     "vault": {
 *       "vaultUrl": "${VAULT_URL}",
 *       "vaultToken": "${VAULT_TOKEN}"
 *     }
 *   }
 * }
 * ```
 */
@Injectable()
export class KmsRegistry implements OnModuleInit {
    private readonly logger = new Logger(KmsRegistry.name);
    private readonly providers = new Map<string, KmsAdapter>();
    private defaultProviderName = "db";

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
        private readonly cryptoService: CryptoImplementationService,
        @InjectRepository(KeyEntity)
        private readonly keyRepository: Repository<KeyEntity>,
    ) {}

    onModuleInit(): void {
        const deps: KmsAdapterDeps = {
            configService: this.configService,
            httpService: this.httpService,
            cryptoService: this.cryptoService,
            keyRepository: this.keyRepository,
        };
        this.loadFromConfig(deps);
    }

    /**
     * Load KMS providers from the config file (kms.json) if it exists.
     * Falls back to registering a single "db" provider if no file is found.
     *
     * @param deps - Shared NestJS dependencies needed by adapter factories
     */
    private loadFromConfig(deps: KmsAdapterDeps): void {
        const configFolder =
            this.configService.get<string>("CONFIG_FOLDER") || "";
        const kmsConfigPath = join(configFolder, "kms.json");

        if (!existsSync(kmsConfigPath)) {
            this.logger.log(
                "No kms.json found — falling back to default DB provider",
            );
            this.registerDefaultDbProvider(deps);
            return;
        }

        this.logger.log(`Loading KMS config from ${kmsConfigPath}`);

        try {
            let rawData = JSON.parse(readFileSync(kmsConfigPath, "utf8"));
            rawData = this.replacePlaceholders(rawData);

            const kmsConfig = plainToClass(KmsConfigDto, rawData);
            const errors = validateSync(kmsConfig, {
                whitelist: true,
                forbidNonWhitelisted: false,
            });

            if (errors.length > 0) {
                const errorMessages = errors.map(
                    (e) =>
                        `${e.property}: ${Object.values(e.constraints || {}).join(", ")}`,
                );
                throw new Error(
                    `Invalid kms.json: ${errorMessages.join("; ")}`,
                );
            }

            // Register each provider (key = type, value = type-specific config)
            for (const [type, providerConfig] of Object.entries(
                kmsConfig.providers,
            )) {
                const config = (providerConfig || {}) as Record<
                    string,
                    unknown
                >;
                const adapter = createKmsAdapter(type, config, deps);
                this.registerProvider(type, adapter);
            }

            // Set default (from config or "db")
            const defaultName = kmsConfig.defaultProvider || "db";

            if (this.hasProvider(defaultName)) {
                this.setDefault(defaultName);
            } else {
                this.logger.warn(
                    `Default provider "${defaultName}" not found in kms.json providers — using first registered provider`,
                );
                const firstProvider = this.listProviders()[0];
                if (firstProvider) {
                    this.setDefault(firstProvider);
                }
            }

            this.logger.log(
                `KMS providers loaded: [${this.listProviders().join(", ")}], default: ${this.defaultProviderName}`,
            );
        } catch (error: any) {
            this.logger.error(
                `Failed to load kms.json: ${error.message}. Falling back to default DB provider.`,
            );
            this.registerDefaultDbProvider(deps);
        }
    }

    /**
     * Register a single "db" provider as the default fallback.
     */
    private registerDefaultDbProvider(deps: KmsAdapterDeps): void {
        const adapter = createKmsAdapter("db", {}, deps);
        this.registerProvider("db", adapter);
        this.setDefault("db");
    }

    /**
     * Register a KMS provider by name.
     */
    registerProvider(name: string, provider: KmsAdapter): void {
        this.providers.set(name, provider);
        this.logger.log(`Registered KMS provider: ${name}`);
    }

    /**
     * Set the default provider name.
     */
    setDefault(name: string): void {
        if (!this.providers.has(name)) {
            throw new Error(
                `Cannot set default KMS provider to "${name}" — not registered`,
            );
        }
        this.defaultProviderName = name;
    }

    /**
     * Get a KMS provider by name.
     * @throws NotFoundException if the provider is not registered.
     */
    getProvider(name: string): KmsAdapter {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new NotFoundException(
                `KMS provider "${name}" is not configured. Available providers: ${this.listProviders().join(", ")}`,
            );
        }
        return provider;
    }

    /**
     * Get the default KMS provider.
     */
    getDefaultProvider(): KmsAdapter {
        return this.getProvider(this.defaultProviderName);
    }

    /**
     * Get the name of the default provider.
     */
    getDefaultProviderName(): string {
        return this.defaultProviderName;
    }

    /**
     * List all registered provider names.
     */
    listProviders(): string[] {
        return Array.from(this.providers.keys());
    }

    /**
     * Get detailed info (name + capabilities) for every registered provider.
     */
    getProviderInfoList(): {
        name: string;
        capabilities: {
            canImport: boolean;
            canCreate: boolean;
            canDelete: boolean;
        };
    }[] {
        return this.listProviders().map((name) => ({
            name,
            capabilities: this.getProvider(name).capabilities,
        }));
    }

    /**
     * Check if a provider is registered.
     */
    hasProvider(name: string): boolean {
        return this.providers.has(name);
    }

    /**
     * Replace `${ENV_VAR}` and `${ENV_VAR:default}` placeholders in config values.
     */
    private replacePlaceholders<T>(input: T): T {
        const recurse = (val: unknown): unknown => {
            if (typeof val === "string") {
                return val.replace(
                    /\$\{([^}:]+)(?::([^}]*))?\}/g,
                    (_match, envVar: string, defaultVal?: string) => {
                        return process.env[envVar] ?? defaultVal ?? "";
                    },
                );
            }
            if (Array.isArray(val)) {
                return val.map(recurse);
            }
            if (val !== null && typeof val === "object") {
                const result: Record<string, unknown> = {};
                for (const key of Object.keys(val as Record<string, unknown>)) {
                    result[key] = recurse(
                        (val as Record<string, unknown>)[key],
                    );
                }
                return result;
            }
            return val;
        };
        return recurse(input) as T;
    }
}
