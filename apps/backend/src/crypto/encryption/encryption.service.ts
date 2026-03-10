import { Injectable } from "@nestjs/common";
import { exportJWK, generateKeyPair, importJWK, JWK, jwtDecrypt } from "jose";
import { KeyUsageType } from "../key/entities/key-chain.entity";
import { KeyChainService } from "../key/key-chain.service";

/**
 * Service for handling encryption and decryption operations.
 */
@Injectable()
export class EncryptionService {
    constructor(private readonly keyChainService: KeyChainService) {}

    /**
     * Initializes the encryption keys for a given tenant.
     * Creates a key chain with an ECDH-ES encryption key.
     * @param tenantId - The ID of the tenant for which to initialize the keys.
     */
    async onTenantInit(tenantId: string): Promise<void> {
        const privateKey = await generateKeyPair("ECDH-ES", {
            crv: "P-256",
            extractable: true,
        }).then(async (secret) => exportJWK(secret.privateKey));

        privateKey.alg = "ECDH-ES";

        await this.keyChainService.createStandalone({
            tenantId,
            description: "Encryption key",
            usageType: KeyUsageType.Encrypt,
            privateKey,
        });
    }

    /**
     * Decrypts a JWE (JSON Web Encryption) response.
     * @param response - The encrypted JWE string.
     * @param tenantId - The ID of the tenant for which to decrypt the response.
     * @returns The decrypted payload.
     */
    async decryptJwe<T>(response: string, tenantId: string): Promise<T> {
        const keyChain = await this.keyChainService.findByUsageType(
            tenantId,
            KeyUsageType.Encrypt,
        );

        const privateEncryptionKey = (await importJWK(
            keyChain.activeKey,
            "ECDH-ES",
        )) as CryptoKey;

        const res = await jwtDecrypt<T>(response, privateEncryptionKey);
        return res.payload;
    }

    /**
     * Retrieves the public encryption key for a given tenant.
     * @param tenantId - The ID of the tenant for which to retrieve the public key.
     * @returns The public encryption key as a JWK.
     */
    async getEncryptionPublicKey(tenantId: string): Promise<JWK> {
        const keyChain = await this.keyChainService.findByUsageType(
            tenantId,
            KeyUsageType.Encrypt,
        );

        // Return public key (without private key component 'd')
        const publicKey: JWK = { ...keyChain.activeKey };
        delete publicKey.d;
        publicKey.kid = keyChain.id;

        return publicKey;
    }
}
