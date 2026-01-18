import { readFileSync } from "node:fs";
import { ConfigService } from "@nestjs/config";
import { Signer } from "@sd-jwt/types";
import { plainToClass } from "class-transformer";
import { JWK, JWSHeaderParameters, JWTPayload } from "jose";
import { PinoLogger } from "nestjs-pino";
import { Repository } from "typeorm";
import { TenantEntity } from "../../auth/tenant/entitites/tenant.entity";
import { ConfigImportService } from "../../shared/utils/config-import/config-import.service";
import {
    ConfigImportOrchestratorService,
    ImportPhase,
} from "../../shared/utils/config-import/config-import-orchestrator.service";
import { KeyImportDto } from "./dto/key-import.dto";
import { UpdateKeyDto } from "./dto/key-update.dto";
import { CertEntity } from "./entities/cert.entity";
import { KeyEntity, KeyUsage } from "./entities/keys.entity";

/**
 * Generic interface for a key service
 */
export abstract class KeyService {
    constructor(
        protected configService: ConfigService,
        protected keyRepository: Repository<KeyEntity>,
        protected configImportService: ConfigImportService,
        private readonly certRepository: Repository<CertEntity>,
        private readonly tenantRepository: Repository<TenantEntity>,
        private readonly logger: PinoLogger,
        configImportOrchestrator: ConfigImportOrchestratorService,
    ) {
        configImportOrchestrator.register(
            "keys",
            ImportPhase.CORE,
            (tenantId) => this.importForTenant(tenantId),
        );
    }

    /**
     * Initialize the key service
     * @param tenantId
     * @returns key id of the initialized key.
     */
    abstract init(tenantId): Promise<string>;

    /**
     * Creates a new keypair
     * @param tenantId
     * @return key id of the generated key.
     */
    abstract create(tenantId): Promise<string>;

    /**
     * Update key metadata
     * @param tenantId
     * @param id
     * @param body
     * @returns
     */
    update(tenantId: string, id: string, body: UpdateKeyDto) {
        return this.keyRepository.update({ tenantId, id }, body);
    }

    /**
     * Import a key into the key service.
     * @param tenantId
     * @param body
     */
    abstract import(tenantId: string, body: KeyImportDto): Promise<string>;

    /**
     * Get the callback for the signer function
     * @param tenantId
     */
    abstract signer(tenantId: string, keyId?: string): Promise<Signer>;

    /**
     * Get the key id
     * @returns
     */
    abstract getKid(tenantId: string, usage: KeyUsage): Promise<string>;

    /**
     * Get the public key
     * @returns
     */
    abstract getPublicKey(
        type: "jwk",
        tenantId: string,
        keyId?: string,
    ): Promise<JWK>;
    abstract getPublicKey(
        type: "pem",
        tenantId: string,
        keyId?: string,
    ): Promise<string>;
    abstract getPublicKey(
        type: "pem" | "jwk",
        tenantId: string,
        keyId?: string,
    ): Promise<JWK | string>;

    //TODO: this can be handled via the signer callback
    abstract signJWT(
        payload: JWTPayload,
        header: JWSHeaderParameters,
        tenantId: string,
        keyId?: string,
    ): Promise<string>;

    getKeys(id: string): Promise<KeyEntity[]> {
        return this.keyRepository.findBy({ tenantId: id, usage: "sign" });
    }

    getKey(tenantId: string, keyId: string): Promise<KeyEntity> {
        return this.keyRepository.findOneOrFail({
            where: {
                tenantId,
                id: keyId,
            },
            relations: ["certificates"],
        });
    }

    abstract deleteKey(tenantId: string, id: string): Promise<void>;

    /**
     * Imports keys for a specific tenant from the file system.
     */
    async importForTenant(tenantId: string) {
        await this.configImportService.importConfigsForTenant<KeyImportDto>(
            tenantId,
            {
                subfolder: "keys",
                fileExtension: ".json",
                validationClass: KeyImportDto,
                resourceType: "key",
                loadData: (filePath) => {
                    const payload = JSON.parse(readFileSync(filePath, "utf8"));
                    return plainToClass(KeyImportDto, payload);
                },
                checkExists: async (tid, data) => {
                    // Get all keys and check if any match the key material
                    const keys = await this.getKeys(tid);
                    // Compare key material (x, y coordinates for EC keys)
                    return keys.some(
                        (k) => k.key.x === data.key.x && k.key.y === data.key.y,
                    );
                },
                deleteExisting: async (tid, data) => {
                    // Find and delete matching key
                    const keys = await this.getKeys(tid);
                    const existingKey = keys.find(
                        (k) => k.key.x === data.key.x && k.key.y === data.key.y,
                    );
                    if (existingKey) {
                        await this.certRepository.delete({
                            id: existingKey.id,
                            tenantId: tid,
                        });
                    }
                },
                processItem: async (tid, config) => {
                    const tenantEntity =
                        await this.tenantRepository.findOneByOrFail({
                            id: tid,
                        });
                    await this.import(tenantEntity.id, config).catch((err) => {
                        this.logger.info(err.message);
                    });
                },
            },
        );
    }
}
