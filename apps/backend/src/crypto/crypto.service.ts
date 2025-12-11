import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
    type CallbackContext,
    calculateJwkThumbprint,
    clientAuthenticationNone,
    HashAlgorithm,
    type Jwk,
    SignJwtCallback,
} from "@openid4vc/oauth2";
import { plainToClass } from "class-transformer";
import { importJWK, type JWK, jwtVerify } from "jose";
import { PinoLogger } from "nestjs-pino";
import { ArrayContains, Repository } from "typeorm";
import { TenantEntity } from "../auth/tenant/entitites/tenant.entity";
import { ConfigImportService } from "../utils/config-import/config-import.service";
import { EC_Public } from "../well-known/dto/jwks-response.dto";
import { CertImportDto } from "./key/dto/cert-import.dto";
import { KeyImportDto } from "./key/dto/key-import.dto";
import { UpdateKeyDto } from "./key/dto/key-update.dto";
import { CertEntity } from "./key/entities/cert.entity";
import { KeyService } from "./key/key.service";

/**
 * Service for cryptographic operations, including key management and certificate handling.
 */
@Injectable()
export class CryptoService {
    find(value: {
        tenantId: string;
        type: string;
        id?: string;
    }): Promise<CertEntity> {
        return this.certRepository.findOneByOrFail({
            tenantId: value.tenantId,
            type: ArrayContains([value.type]),
            id: value.id,
        });
    }
    /**
     * Folder where the keys are stored.
     */
    folder!: string;

    /**
     * Constructor for CryptoService.
     * @param configService
     * @param keyService
     * @param certRepository
     */
    constructor(
        @Inject("KeyService") public readonly keyService: KeyService,
        @InjectRepository(CertEntity)
        private certRepository: Repository<CertEntity>,
        private logger: PinoLogger,
        @InjectRepository(TenantEntity)
        private tenantRepository: Repository<TenantEntity>,
        private configImportService: ConfigImportService,
    ) {}

    /**
     * Imports keys and certificates from the configured folder.
     * @param tenantId
     * @returns
     */
    getCerts(tenantId: string): Promise<CertEntity[]> {
        return this.certRepository.findBy({
            tenantId,
        });
    }

    /**
     * Imports keys from the file system into the key service.
     */
    async importKeys() {
        await this.configImportService.importConfigs<KeyImportDto>({
            subfolder: "keys",
            fileExtension: ".json",
            validationClass: KeyImportDto,
            resourceType: "key",
            loadData: (filePath) => {
                const payload = JSON.parse(readFileSync(filePath, "utf8"));
                return plainToClass(KeyImportDto, payload);
            },
            checkExists: async (tenantId, data) => {
                // Get all keys and check if any match the key material
                const keys = await this.keyService.getKeys(tenantId);
                // Compare key material (x, y coordinates for EC keys)
                return keys.some(
                    (k) => k.key.x === data.key.x && k.key.y === data.key.y,
                );
            },
            deleteExisting: async (tenantId, data) => {
                // Find and delete matching key
                const keys = await this.keyService.getKeys(tenantId);
                const existingKey = keys.find(
                    (k) => k.key.x === data.key.x && k.key.y === data.key.y,
                );
                if (existingKey) {
                    await this.certRepository.delete({
                        id: existingKey.id,
                        tenantId,
                    });
                }
            },
            processItem: async (tenantId, config) => {
                const tenantEntity =
                    await this.tenantRepository.findOneByOrFail({
                        id: tenantId,
                    });
                await this.keyService
                    .import(tenantEntity.id, config)
                    .catch((err) => {
                        this.logger.info(err.message);
                    });
            },
        });
    }

    /**
     * Imports certs from the file system into the cert service.
     */
    async importCerts() {
        await this.configImportService.importConfigs<CertImportDto>({
            subfolder: "certs",
            fileExtension: ".json",
            validationClass: CertImportDto,
            resourceType: "cert",
            loadData: (filePath) => {
                const payload = JSON.parse(readFileSync(filePath, "utf8"));
                return plainToClass(CertImportDto, payload);
            },
            checkExists: (tenantId, data) => {
                return this.hasEntry(tenantId, data.id);
            },
            deleteExisting: async (tenantId, data) => {
                // Find and delete matching certs
                const certs = await this.certRepository.findBy({ tenantId });
                const existingCert = certs.find((c) => c.id === data.id);
                if (existingCert) {
                    await this.certRepository.delete({
                        id: existingCert.id,
                        tenantId,
                    });
                }
            },
            processItem: async (tenantId, config) => {
                const tenantEntity =
                    await this.tenantRepository.findOneByOrFail({
                        id: tenantId,
                    });
                this.certRepository.save({
                    ...config,
                    tenantId: tenantEntity.id,
                });
            },
        });
    }

    /**
     * Check if a certificate exists for the given tenant and keyId.
     * @param tenantId
     * @param certId
     * @returns
     */
    hasEntry(tenantId: string, certId: string): Promise<boolean> {
        return this.certRepository
            .findOneBy({ tenantId, id: certId })
            .then((cert) => !!cert);
    }

    /**
     * Get a certificate entry by tenantId and keyId.
     * @param tenantId
     * @param certId
     * @returns
     */
    getCertEntry(tenantId: string, certId: string): Promise<CertEntity> {
        return this.certRepository.findOneByOrFail({ tenantId, id: certId });
    }

    /**
     * Get the certificate for the given tenant and keyId.
     * @param tenantId
     * @param certId
     * @returns
     */
    getCert(tenantId: string, certId: string): Promise<string> {
        return this.certRepository
            .findOneBy({ tenantId, id: certId })
            .then((cert) => cert!.crt);
    }

    /**
     * Update an existing certificate in the key service.
     * @param tenantId
     * @param id
     * @param body
     */
    updateCert(tenantId: string, id: string, body: UpdateKeyDto) {
        this.certRepository.update({ tenantId, id }, body);
    }

    /**
     * Get the certificate chain for the given type to be included in the JWS header.
     * @param type
     * @param tenantId
     * @param keyId
     * @returns
     */
    getCertChain(cert: CertEntity) {
        const chain = cert.crt
            .replace("-----BEGIN CERTIFICATE-----", "")
            .replace("-----END CERTIFICATE-----", "")
            .replace(/\r?\n|\r/g, "");
        return [chain];
    }

    /**
     * Store the access certificate for the tenant.
     * @param crt
     * @param tenantId
     */
    async storeAccessCertificate(crt: string, tenantId: string, id: string) {
        await this.certRepository.save({
            tenantId,
            id,
            crt,
            type: ["access"],
        });
    }

    /**
     * Sign a JWT with the key service.
     * @param header
     * @param payload
     * @param tenantId
     * @returns
     */
    signJwt(
        header: any,
        payload: any,
        tenantId: string,
        keyId?: string,
    ): Promise<string> {
        return this.keyService.signJWT(payload, header, tenantId, keyId);
    }

    /**
     * Verify a JWT with the key service.
     * @param compact
     * @param tenantId
     * @param payload
     * @returns
     */
    async verifyJwt(
        compact: string,
        tenantId: string,
        payload?: Record<string, any>,
    ): Promise<{ verified: boolean }> {
        const publicJwk = await this.keyService.getPublicKey("jwk", tenantId);
        const publicCryptoKey = await importJWK(publicJwk, "ES256");

        try {
            await jwtVerify(compact, publicCryptoKey, {
                currentDate: payload?.exp
                    ? new Date((payload.exp - 300) * 1000)
                    : undefined,
            });
            return { verified: true };
        } catch {
            return { verified: false };
        }
    }
    /**
     * Get the callback context for the key service.
     * @param tenantId
     * @returns
     */
    getCallbackContext(
        tenantId: string,
    ): Omit<CallbackContext, "encryptJwe" | "decryptJwe"> {
        return {
            hash: (data, alg) =>
                createHash(alg.replace("-", "").toLowerCase())
                    .update(data)
                    .digest(),
            generateRandom: (bytes) => randomBytes(bytes),
            clientAuthentication: clientAuthenticationNone({
                clientId: "some-random",
            }),
            fetch: this.fetchFunction(tenantId).bind(this),
            //clientId: 'some-random-client-id', // TODO: Replace with your real clientId if necessary
            signJwt: this.getSignJwtCallback(tenantId),
            verifyJwt: async (signer, { compact, payload }) => {
                if (signer.method !== "jwk") {
                    throw new Error("Signer method not supported");
                }

                const josePublicKey = await importJWK(
                    signer.publicJwk as JWK,
                    signer.alg,
                );
                try {
                    await jwtVerify(compact, josePublicKey, {
                        currentDate: payload?.exp
                            ? new Date((payload.exp - 300) * 1000)
                            : undefined,
                    });
                    return { verified: true, signerJwk: signer.publicJwk };
                } catch {
                    return { verified: false };
                }
            },
        };
    }

    /**
     * Override the fetch function since key can be passed
     * @param tenantId
     * @returns
     */
    fetchFunction(tenantId: string) {
        return (): Promise<Response> => {
            return Promise.resolve({
                json: async () => {
                    return {
                        keys: [await this.getJwks(tenantId)],
                    };
                },
                ok: true,
                headers: new Headers({ "Content-Type": "application/json" }),
            }) as Promise<Response>;
        };
    }

    // Helper to generate signJwt callback
    getSignJwtCallback(tenantId: string): SignJwtCallback {
        return async (signer, { header, payload }) => {
            if (signer.method !== "jwk") {
                throw new Error("Signer method not supported");
            }
            const hashCallback = this.getCallbackContext(tenantId).hash;
            const jwkThumbprint = await calculateJwkThumbprint({
                jwk: signer.publicJwk,
                hashAlgorithm: HashAlgorithm.Sha256,
                hashCallback,
            });

            const privateThumbprint = await calculateJwkThumbprint({
                jwk: (await this.keyService.getPublicKey(
                    "jwk",
                    tenantId,
                )) as Jwk,
                hashAlgorithm: HashAlgorithm.Sha256,
                hashCallback,
            });

            if (jwkThumbprint !== privateThumbprint) {
                throw new Error(
                    `No private key available for public jwk \n${JSON.stringify(signer.publicJwk, null, 2)}`,
                );
            }

            const jwt = await this.signJwt(header, payload, tenantId);

            return {
                jwt,
                signerJwk: signer.publicJwk,
            };
        };
    }

    /**
     * Get the JWKs for the tenant.
     * @param tenantId
     * @returns
     */
    getJwks(tenantId: string) {
        return this.keyService.getPublicKey(
            "jwk",
            tenantId,
        ) as Promise<EC_Public>;
    }

    /**
     * Get the base64 url encoded SHA-256 hash of the certificate for the given tenant and keyId.
     * @param tenantId
     * @param keyId
     */
    getCertHash(cert: CertEntity) {
        const der = Buffer.from(
            cert.crt
                .replace("-----BEGIN CERTIFICATE-----", "")
                .replace("-----END CERTIFICATE-----", "")
                .replace(/\r?\n|\r/g, ""),
            "base64url",
        );
        return createHash("sha256").update(der).digest();
    }
}
