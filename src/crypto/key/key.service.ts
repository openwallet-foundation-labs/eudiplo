import { Signer } from '@sd-jwt/types';
import { JWK, JWTPayload, JoseHeaderParameters } from 'jose';
import { KeyImportDto } from './dto/key-import.dto';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { CertEntity } from './entities/cert.entity';
import { ConflictException } from '@nestjs/common';

/**
 * Represents a key entity with its unique identifier, public key, and certificate.
 */
export class KeyObj {
    /**
     * Unique identifier for the key.
     */
    id: string;
    /**
     * Public key in JWK format.
     */
    publicKey: JWK;
    /**
     * Certificate in PEM format.
     */
    crt: string;
}

/**
 * Generic interface for a key service
 */
export abstract class KeyService {
    constructor(
        protected configService: ConfigService,
        protected certRepository: Repository<CertEntity>,
    ) {}

    /**
     * Initialize the key service
     */
    abstract init(tenantId): Promise<void>;

    /**
     * Creates a new keypair
     * @param tenantId
     * @return key id of the generated key.
     */
    abstract create(tenantId): Promise<string>;

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
    abstract getKid(tenantId: string): Promise<string>;

    abstract getKeys(tenantId: string): Promise<KeyObj[]>;

    /**
     * Get the public key
     * @returns
     */
    abstract getPublicKey(
        type: 'jwk',
        tenantId: string,
        keyId?: string,
    ): Promise<JWK>;
    abstract getPublicKey(
        type: 'pem',
        tenantId: string,
        keyId?: string,
    ): Promise<string>;
    abstract getPublicKey(
        type: 'pem' | 'jwk',
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
                keyId,
            })
            .then(
                (cert) => cert.crt,
                () => {
                    throw new ConflictException('Certificate not found');
                },
            );
    }
}
