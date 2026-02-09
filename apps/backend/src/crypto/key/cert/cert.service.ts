import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as x509 from "@peculiar/x509";
import { plainToClass } from "class-transformer";
import { importJWK } from "jose";
import { Repository } from "typeorm";
import { v4 } from "uuid";
import { TenantEntity } from "../../../auth/tenant/entitites/tenant.entity";
import { ConfigImportService } from "../../../shared/utils/config-import/config-import.service";
import {
    ConfigImportOrchestratorService,
    ImportPhase,
} from "../../../shared/utils/config-import/config-import-orchestrator.service";
import { CertImportDto } from "../dto/cert-import.dto";
import { CertUpdateDto } from "../dto/cert-update.dto";
import { UpdateKeyDto } from "../dto/key-update.dto";
import { CertEntity } from "../entities/cert.entity";
import { CertUsage, CertUsageEntity } from "../entities/cert-usage.entity";
import { KeyService } from "../key.service";
import { CrlValidationService } from "./crl-validation.service";

const ECDSA_P256 = {
    name: "ECDSA",
    namedCurve: "P-256",
    hash: "SHA-256" as const,
};

export interface FindCertOptions {
    tenantId: string;
    type: CertUsage;
    id?: string;
    /**
     * Skip certificate validation (expiry and CRL check).
     * Default: false
     */
    skipValidation?: boolean;
}

/**
 * Result of certificate validation.
 */
export interface CertValidationResult {
    /** Whether the certificate passed all validations */
    isValid: boolean;
    /** Error message if validation failed */
    error?: string;
    /** Whether the certificate is expired */
    isExpired?: boolean;
    /** Whether the certificate is revoked */
    isRevoked?: boolean;
    /** Certificate expiry date */
    expiresAt?: Date;
    /** Certificate validity start date */
    validFrom?: Date;
}

/**
 * Service for managing certificates associated with keys.
 */
@Injectable()
export class CertService {
    private readonly logger = new Logger(CertService.name);

    constructor(
        @InjectRepository(CertEntity)
        private readonly certRepository: Repository<CertEntity>,
        @InjectRepository(CertUsageEntity)
        private readonly certUsageRepository: Repository<CertUsageEntity>,
        @Inject("KeyService") public readonly keyService: KeyService,
        private readonly configService: ConfigService,
        @InjectRepository(TenantEntity)
        private readonly tenantRepository: Repository<TenantEntity>,
        private readonly configImportService: ConfigImportService,
        configImportOrchestrator: ConfigImportOrchestratorService,
        @Optional()
        private readonly crlValidationService?: CrlValidationService,
    ) {
        configImportOrchestrator.register(
            "certificates",
            ImportPhase.CORE,
            (tenantId) => this.importForTenant(tenantId),
        );
    }

    /**
     * Get all certificates for a tenant (across all keys).
     * @param tenantId - The tenant ID
     * @returns Array of certificates with their associated key information
     */
    getAllCertificates(tenantId: string): Promise<CertEntity[]> {
        return this.certRepository.find({
            where: { tenantId },
            relations: ["key"],
        });
    }

    /**
     * Get all certificates for a specific key.
     * @param tenantId - The tenant ID
     * @param keyId - The key ID
     * @returns Array of certificates
     */
    getCertificates(tenantId: string, keyId: string): Promise<CertEntity[]> {
        return this.certRepository.find({
            where: {
                tenantId,
                key: { id: keyId, tenantId },
            },
            relations: ["key"],
        });
    }

    /**
     * Get a specific certificate by ID (without keyId requirement).
     * @param tenantId - The tenant ID
     * @param certId - The certificate ID
     * @returns The certificate entity
     */
    getCertificateById(tenantId: string, certId: string): Promise<CertEntity> {
        return this.certRepository.findOneOrFail({
            where: {
                tenantId,
                id: certId,
            },
            relations: ["key"],
        });
    }

    /**
     * Get the configuration of a certificate for import/export.
     * @param id
     * @param certId
     * @returns
     */
    async getCertificateConfig(
        id: string,
        certId: string,
    ): Promise<CertImportDto> {
        const cert = await this.getCertificateById(id, certId);
        const usages = await this.certUsageRepository.findBy({
            tenantId: id,
            certId: cert.id,
        });

        return {
            id: cert.id,
            keyId: cert.key.id,
            description: cert.description,
            crt: cert.crt,
            certUsageTypes: usages.map((u) => u.usage),
        };
    }

    /**
     * Add a new certificate to a key.
     * @param tenantId - The tenant ID
     * @param keyId - The key ID
     * @param dto - Certificate data
     * @returns The created certificate with its ID
     */
    async addCertificate(
        tenantId: string,
        dto: CertImportDto,
    ): Promise<string> {
        //check if the key exists
        await this.keyService.getKey(tenantId, dto.keyId);

        const certId = dto.id ?? v4();

        await this.certRepository.save({
            id: certId,
            tenantId,
            crt: dto.crt,
            description: dto.description,
            key: { id: dto.keyId, tenantId },
            usages: dto.certUsageTypes.map((usage) => ({
                certId,
                usage,
                tenantId,
            })),
        });

        return certId;
    }

    /**
     * Generates a self-signed certificate for the given tenant/key id.
     */
    async addSelfSignedCert(
        tenant: TenantEntity,
        keyId: string,
        dto: CertImportDto,
    ) {
        // === Inputs/parameters (subject + SAN hostname) ===
        const subjectCN = dto.subjectName || tenant.name;
        const hostname = new URL(
            this.configService.getOrThrow<string>("PUBLIC_URL"),
        ).hostname;

        // === Get the key pair for the certificate ===
        const subjectSpkiPem = await this.keyService.getPublicKey(
            "pem",
            tenant.id,
            keyId,
        );
        const publicKey = await new x509.PublicKey(subjectSpkiPem).export(
            { name: "ECDSA", namedCurve: "P-256" },
            ["verify"],
        );

        // Get the private key from the database
        const keyEntity = await this.keyService.getKey(tenant.id, keyId);
        const privateJwk = keyEntity.key;
        const privateKey = (await importJWK(privateJwk, "ES256")) as CryptoKey;

        const now = new Date();
        const inOneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

        // === Create a single self-signed certificate ===
        const selfSignedCert =
            await x509.X509CertificateGenerator.createSelfSigned({
                serialNumber: "01",
                name: `C=DE, CN=${subjectCN}`,
                notBefore: now,
                notAfter: inOneYear,
                signingAlgorithm: ECDSA_P256,
                keys: { publicKey, privateKey },
                extensions: [
                    new x509.SubjectAlternativeNameExtension([
                        { type: "dns", value: hostname },
                    ]),
                    new x509.BasicConstraintsExtension(true, undefined, true), // CA:TRUE, critical
                    new x509.KeyUsagesExtension(
                        x509.KeyUsageFlags.digitalSignature |
                            x509.KeyUsageFlags.keyEncipherment |
                            x509.KeyUsageFlags.keyCertSign, // Allow signing other certificates
                        true,
                    ),
                    await x509.SubjectKeyIdentifierExtension.create(publicKey),
                ],
            });

        const crtPem = selfSignedCert.toString("pem"); // PEM-encoded certificate

        return this.addCertificate(tenant.id, {
            crt: [crtPem],
            certUsageTypes: dto.certUsageTypes,
            description:
                dto.description ??
                `Self-signed certificate (${dto.certUsageTypes.join(", ")}) for tenant ${tenant.name}`,
            keyId,
        });
    }

    /**
     * Update certificate metadata (description and usage types).
     * @param tenantId - The tenant ID
     * @param keyId - The key ID
     * @param certId - The certificate ID to update
     * @param updates - The updates to apply
     */
    async updateCertificate(
        tenantId: string,
        certId: string,
        updates: CertUpdateDto,
    ): Promise<void> {
        // Update description or other simple fields (not usages)
        await this.certRepository.update(
            {
                tenantId,
                id: certId,
            },
            {
                description: updates.description,
            },
        );

        // Remove old usages
        await this.certUsageRepository.delete({ tenantId, certId });

        // Add new usages
        if (updates.certUsageTypes && updates.certUsageTypes.length > 0) {
            const newUsages = updates.certUsageTypes.map((usage) =>
                this.certUsageRepository.create({
                    certId,
                    usage,
                    tenantId,
                }),
            );
            await this.certUsageRepository.save(newUsages);
        }
    }

    /**
     * Delete a certificate.
     * @param tenantId - The tenant ID
     * @param keyId - The key ID
     * @param certId - The certificate ID to delete
     */
    async deleteCertificate(tenantId: string, certId: string): Promise<void> {
        const result = await this.certRepository.delete({
            id: certId,
            tenantId,
        });

        if (result.affected === 0) {
            throw new Error(`Certificate ${certId} not found`);
        }
    }

    /**
     * Find a certificate by tenantId and type.
     * @param value - The search criteria
     * @returns The matching certificate
     */
    /**
     * Find a certificate by tenantId and usage type.
     */
    async find(value: FindCertOptions): Promise<CertEntity> {
        const certUsage = await this.certUsageRepository.findOneOrFail({
            where: {
                tenantId: value.tenantId,
                usage: value.type,
                certId: value.id || undefined,
            },
            relations: ["cert"],
        });

        const cert = certUsage.cert;

        // Validate the certificate unless explicitly skipped
        if (!value.skipValidation) {
            const validationResult = await this.validateCertificate(cert);
            if (!validationResult.isValid) {
                throw new Error(
                    `Certificate ${cert.id} validation failed: ${validationResult.error}`,
                );
            }
        }

        return cert;
    }

    /**
     * Validate a certificate for expiry and revocation status.
     *
     * @param cert - The certificate entity to validate
     * @returns Validation result with details
     */
    async validateCertificate(cert: CertEntity): Promise<CertValidationResult> {
        try {
            // Use the first certificate (leaf) for validation
            const x509Cert = new x509.X509Certificate(cert.crt[0]);

            // Check time validity
            const now = new Date();
            const validFrom = x509Cert.notBefore;
            const expiresAt = x509Cert.notAfter;

            if (now < validFrom) {
                return {
                    isValid: false,
                    error: `Certificate is not yet valid (valid from: ${validFrom.toISOString()})`,
                    isExpired: false,
                    validFrom,
                    expiresAt,
                };
            }

            if (now > expiresAt) {
                this.logger.warn(
                    `Certificate ${cert.id} has expired at ${expiresAt.toISOString()}`,
                );
                return {
                    isValid: false,
                    error: `Certificate expired at ${expiresAt.toISOString()}`,
                    isExpired: true,
                    validFrom,
                    expiresAt,
                };
            }

            // Check CRL if the service is available
            if (this.crlValidationService) {
                const crlResult =
                    await this.crlValidationService.checkCertificateRevocation(
                        cert.crt[0],
                    );

                if (
                    !crlResult.isValid &&
                    !crlResult.error?.includes("No CRL")
                ) {
                    this.logger.warn(
                        `Certificate ${cert.id} revocation check failed: ${crlResult.error || "revoked"}`,
                    );
                    return {
                        isValid: false,
                        error:
                            crlResult.error ||
                            `Certificate revoked at ${crlResult.revokedAt?.toISOString()}`,
                        isRevoked: true,
                        validFrom,
                        expiresAt,
                    };
                }

                // Log if CRL couldn't be checked but don't fail
                if (crlResult.error?.includes("No CRL")) {
                    this.logger.debug(
                        `Certificate ${cert.id} has no CRL Distribution Points, skipping revocation check`,
                    );
                }
            }

            return {
                isValid: true,
                validFrom,
                expiresAt,
            };
        } catch (error: any) {
            this.logger.error(
                `Failed to validate certificate ${cert.id}: ${error.message}`,
            );
            return {
                isValid: false,
                error: `Certificate validation error: ${error.message}`,
            };
        }
    }

    /**
     * Check if a certificate is expired.
     *
     * @param cert - The certificate entity to check
     * @returns True if the certificate is expired
     */
    isCertificateExpired(cert: CertEntity): boolean {
        try {
            // Use the first certificate (leaf) for expiry check
            const x509Cert = new x509.X509Certificate(cert.crt[0]);
            return new Date() > x509Cert.notAfter;
        } catch {
            return true; // Assume expired if we can't parse
        }
    }

    /**
     * Get certificate validity information.
     *
     * @param cert - The certificate entity
     * @returns Object with validFrom and expiresAt dates
     */
    getCertificateValidity(cert: CertEntity): {
        validFrom: Date;
        expiresAt: Date;
    } {
        // Use the first certificate (leaf) for validity
        const x509Cert = new x509.X509Certificate(cert.crt[0]);
        return {
            validFrom: x509Cert.notBefore,
            expiresAt: x509Cert.notAfter,
        };
    }

    /**
     * Find a certificate or create one if it does not exist.
     * @param value
     * @returns
     */
    findOrCreate(value: FindCertOptions): Promise<CertEntity> {
        return this.find(value).catch(async () => {
            // Create a new key
            const keyId = await this.keyService.create(value.tenantId);

            const dto: CertImportDto = {
                certUsageTypes: [value.type],
                keyId,
            };

            // Create a self-signed certificate for the new key
            const certId = await this.addSelfSignedCert(
                await this.tenantRepository.findOneByOrFail({
                    id: value.tenantId,
                }),
                keyId,
                dto,
            );

            // Retrieve and return the newly created certificate
            return this.certRepository.findOneByOrFail({
                tenantId: value.tenantId,
                id: certId,
            });
        });
    }

    /**
     * Check if a certificate exists for the given tenant and certId.
     * @param tenantId - The tenant ID
     * @param certId - The certificate ID
     * @returns True if certificate exists
     */
    hasEntry(tenantId: string, certId: string): Promise<boolean> {
        return this.certRepository
            .findOneBy({ tenantId, id: certId })
            .then((cert) => !!cert);
    }

    /**
     * Update an existing certificate.
     * @param tenantId - The tenant ID
     * @param id - The certificate ID
     * @param body - Update data
     */
    updateCert(tenantId: string, id: string, body: UpdateKeyDto) {
        this.certRepository.update({ tenantId, id }, body);
    }

    /**
     * Get the certificate chain to be included in the JWS header.
     * @param cert - The certificate entity
     * @returns Array with base64-encoded certificates (leaf first, then intermediates/root)
     */
    getCertChain(cert: CertEntity): string[] {
        return cert.crt.map((pem) =>
            pem
                .replace("-----BEGIN CERTIFICATE-----", "")
                .replace("-----END CERTIFICATE-----", "")
                .replaceAll(/\s/g, ""),
        );
    }

    /**
     * Get the base64 url encoded SHA-256 hash of the leaf certificate.
     * @param cert - The certificate entity
     * @returns The certificate hash as base64url encoded string
     */
    getCertHash(cert: CertEntity): string {
        // Extract DER from PEM (PEM is base64 encoded, not base64url)
        // Use the first certificate (leaf) for the hash
        const der = Buffer.from(
            cert.crt[0]
                .replace("-----BEGIN CERTIFICATE-----", "")
                .replace("-----END CERTIFICATE-----", "")
                .replaceAll(/\r?\n|\r/g, ""),
            "base64",
        );
        // Hash the DER and return as base64url
        return createHash("sha256").update(der).digest("base64url");
    }

    /**
     * Imports certificates for a specific tenant from the file system.
     */
    async importForTenant(tenantId: string) {
        await this.configImportService.importConfigsForTenant<CertImportDto>(
            tenantId,
            {
                subfolder: "certs",
                fileExtension: ".json",
                validationClass: CertImportDto,
                resourceType: "cert",
                loadData: (filePath) => {
                    const payload = JSON.parse(readFileSync(filePath, "utf8"));
                    return plainToClass(CertImportDto, payload);
                },
                checkExists: (tid, data) => {
                    return data.id
                        ? this.hasEntry(tid, data.id)
                        : Promise.resolve(false);
                },
                deleteExisting: async (tid, data) => {
                    // Find and delete matching certs
                    const certs = await this.certRepository.findBy({
                        tenantId: tid,
                    });
                    const existingCert = certs.find((c) => c.id === data.id);
                    if (existingCert) {
                        await this.certRepository
                            .delete({
                                id: existingCert.id,
                                tenantId: tid,
                            })
                            .catch((err) => {
                                this.logger.error(
                                    `[${tid}] Error deleting existing cert ${existingCert.id}: ${err.message}`,
                                );
                                throw err;
                            });
                    }
                },
                processItem: async (tid, config) => {
                    const tenantEntity =
                        await this.tenantRepository.findOneByOrFail({
                            id: tid,
                        });

                    this.addCertificate(tid, config);
                },
            },
        );
    }
}
