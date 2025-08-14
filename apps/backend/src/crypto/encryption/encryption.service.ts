import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import e from "express";
import { exportJWK, generateKeyPair, importJWK, JWK, jwtDecrypt } from "jose";
import { Repository } from "typeorm/repository/Repository";
import { v4 } from "uuid";
import { KeyEntity } from "../key/entities/keys.entity";

/**
 * Service for handling encryption and decryption operations.
 */
@Injectable()
export class EncryptionService {
    /**
     * Constructor for the EncryptionService.
     * @param configService
     */
    constructor(
        @InjectRepository(KeyEntity)
        private keyRepository: Repository<KeyEntity>,
    ) {}

    /**
     * Initializes the encryption keys for a given tenant.
     * @param tenantId - The ID of the tenant for which to initialize the keys.
     */
    async onTenantInit(tenantId: string) {
        const privateKey = await generateKeyPair("ECDH-ES", {
            crv: "P-256",
            extractable: true,
        }).then(async (secret) => exportJWK(secret.privateKey));

        this.keyRepository.save({
            id: v4(),
            tenantId,
            key: privateKey,
            usage: "encrypt",
        });
    }

    /**
     * Encrypts a response using JWE (JSON Web Encryption).
     * @param response - The response to encrypt.
     * @param tenantId - The ID of the tenant for which to encrypt the response.
     * @returns The encrypted response as a JWE string.
     */
    async decryptJwe<T>(response: string, tenantId: string): Promise<T> {
        const privateEncryptionKey = await this.keyRepository
            .findOneByOrFail({
                tenantId,
                usage: "encrypt",
            })
            .then(
                (keyEntity) => importJWK(keyEntity.key) as Promise<CryptoKey>,
            );

        const res = await jwtDecrypt<T>(response, privateEncryptionKey);
        return res.payload;
    }

    /**
     * Retrieves the public encryption key for a given tenant.
     * @param tenantId - The ID of the tenant for which to retrieve the public key.
     * @returns The public encryption key as a JWK.
     */
    getEncryptionPublicKey(tenantId: string): Promise<JWK> {
        return this.keyRepository
            .findOneByOrFail({
                tenantId,
                usage: "encrypt",
            })
            .then((entry) => {
                delete entry.key.d;
                return entry.key;
            });
    }
}
