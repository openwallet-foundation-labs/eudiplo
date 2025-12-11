import { ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Signer } from "@sd-jwt/types";
import { JoseHeaderParameters, JWK, JWTPayload } from "jose";
import { Repository } from "typeorm";
import { KeyImportDto } from "./dto/key-import.dto";
import { UpdateKeyDto } from "./dto/key-update.dto";
import { CertEntity, CertificateType } from "./entities/cert.entity";
import { KeyEntity } from "./entities/keys.entity";

/**
 * Generic interface for a key service
 */
export abstract class KeyService {
    constructor(
        protected configService: ConfigService,
        protected certRepository: Repository<CertEntity>,
        protected keyRepository: Repository<KeyEntity>,
    ) {}

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
    abstract getKid(tenantId: string, type?: CertificateType): Promise<string>;

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
        header: JoseHeaderParameters,
        tenantId: string,
        keyId?: string,
    ): Promise<string>;

    /**
     * Get the certificate for the given key id.
     * @param tenantId
     * @param keyId
     * @returns
     */
    protected getCertificate(tenantId: string, keyId: string): Promise<string> {
        return this.certRepository
            .findOneByOrFail({
                tenantId,
                id: keyId,
            })
            .then(
                (cert) => cert.crt,
                () => {
                    throw new ConflictException("Certificate not found");
                },
            );
    }

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
}
