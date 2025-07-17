import { OnModuleInit } from '@nestjs/common';
import { Signer } from '@sd-jwt/types';
import { JWK, JWTPayload, JoseHeaderParameters } from 'jose';

/**
 * Generic interface for a key service
 */
export abstract class KeyService {
    /**
     * Initialize the key service
     */
    abstract init(tenantId): Promise<void>;

    /**
     * Get the callback for the signer function
     * @param tenantId
     */
    abstract signer(tenantId: string): Promise<Signer>;

    /**
     * Get the key id
     * @returns
     */
    abstract getKid(tenantId: string): Promise<string>;

    /**
     * Get the public key
     * @returns
     */
    abstract getPublicKey(type: 'jwk', tenantId: string): Promise<JWK>;
    abstract getPublicKey(type: 'pem', tenantId: string): Promise<string>;
    abstract getPublicKey(
        type: 'pem' | 'jwk',
        tenantId: string,
    ): Promise<JWK | string>;

    //TODO: this can be handled via the signer callback
    abstract signJWT(
        payload: JWTPayload,
        header: JoseHeaderParameters,
        tenantId: string,
    ): Promise<string>;
}
