import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { importJWK, exportJWK, generateKeyPair, jwtDecrypt, JWK } from 'jose';
import { join } from 'path';

/**
 * Service for handling encryption and decryption operations.
 */
@Injectable()
export class EncryptionService {
    /**
     * Constructor for the EncryptionService.
     * @param configService
     */
    constructor(private configService: ConfigService) {}

    /**
     * Initializes the encryption keys for a given tenant.
     * @param tenantId - The ID of the tenant for which to initialize the keys.
     */
    async onTenantInit(tenantId: string) {
        const folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            'keys',
        );
        const privateEncryptionPath = join(folder, 'private-encryption.json');
        const publicEncryptionPath = join(folder, 'public-encryption.json');
        if (!existsSync(privateEncryptionPath)) {
            await generateKeyPair('ECDH-ES', {
                crv: 'P-256',
                extractable: true,
            }).then(async (secret) => {
                writeFileSync(
                    privateEncryptionPath,
                    JSON.stringify(await exportJWK(secret.privateKey), null, 2),
                );
                writeFileSync(
                    publicEncryptionPath,
                    JSON.stringify(await exportJWK(secret.publicKey), null, 2),
                );
            });
        }
    }

    /**
     * Encrypts a response using JWE (JSON Web Encryption).
     * @param response - The response to encrypt.
     * @param tenantId - The ID of the tenant for which to encrypt the response.
     * @returns The encrypted response as a JWE string.
     */
    async decryptJwe<T>(response: string, tenantId: string): Promise<T> {
        const folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            'keys',
        );
        const privateEncryptionPath = join(folder, 'private-encryption.json');

        const privateEncryptionKey = await importJWK(
            JSON.parse(readFileSync(privateEncryptionPath, 'utf-8')),
            'ECDH-ES',
        );

        const res = await jwtDecrypt<T>(response, privateEncryptionKey);
        return res.payload;
    }

    /**
     * Retrieves the public encryption key for a given tenant.
     * @param tenantId - The ID of the tenant for which to retrieve the public key.
     * @returns The public encryption key as a JWK.
     */
    getEncryptionPublicKey(tenantId: string): JWK {
        const folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            'keys',
        );
        const publicEncryptionPath = join(folder, 'public-encryption.json');
        return JSON.parse(readFileSync(publicEncryptionPath, 'utf-8')) as JWK;
    }
}
