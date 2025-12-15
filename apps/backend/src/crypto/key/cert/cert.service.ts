import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as x509 from "@peculiar/x509";
import { plainToClass } from "class-transformer";
import { randomUUID } from "crypto";
import { importJWK } from "jose";
import { Repository } from "typeorm";
import { v4 } from "uuid";
import { TenantEntity } from "../../../auth/tenant/entitites/tenant.entity";
import { ConfigImportService } from "../../../utils/config-import/config-import.service";
import { CertImportDto } from "../dto/cert-import.dto";
import { CertUpdateDto } from "../dto/cert-update.dto";
import { UpdateKeyDto } from "../dto/key-update.dto";
import { CertEntity } from "../entities/cert.entity";
import { KeyService } from "../key.service";

const ECDSA_P256 = {
    name: "ECDSA",
    namedCurve: "P-256",
    hash: "SHA-256" as const,
};

/**
 * Service for managing certificates associated with keys.
 */
@Injectable()
export class CertService {
    constructor(
        @InjectRepository(CertEntity)
        private readonly certRepository: Repository<CertEntity>,
        @Inject("KeyService") public readonly keyService: KeyService,
        private readonly configService: ConfigService,
        @InjectRepository(TenantEntity)
        private tenantRepository: Repository<TenantEntity>,
        private configImportService: ConfigImportService,
    ) {}

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
                key: { id: keyId },
            },
        });
    }

    /**
     * Get a specific certificate by ID.
     * @param tenantId - The tenant ID
     * @param keyId - The key ID
     * @param certId - The certificate ID
     * @returns The certificate entity
     */
    getCertificate(
        tenantId: string,
        keyId: string,
        certId: string,
    ): Promise<CertEntity> {
        return this.certRepository.findOneOrFail({
            where: {
                tenantId,
                id: certId,
                key: { id: keyId },
            },
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
     * Add a new certificate to a key.
     * @param tenantId - The tenant ID
     * @param keyId - The key ID
     * @param dto - Certificate data
     * @returns The created certificate with its ID
     */
    async addCertificate(
        tenantId: string,
        keyId: string,
        dto: CertImportDto,
    ): Promise<{ id: string }> {
        const certId = v4();

        await this.certRepository.save({
            id: certId,
            tenantId,
            crt: dto.crt,
            isAccessCert: dto.isAccessCert,
            isSigningCert: dto.isSigningCert,
            description: dto.description,
            key: { id: keyId, tenantId },
        });

        return { id: certId };
    }

    /**
     * Generates a self-signed certificate for the given tenant/key id.
     */
    async addSelfSignedCert(
        tenant: TenantEntity,
        keyId: string,
        isAccessCert: boolean,
        isSigningCert: boolean,
    ) {
        // === Inputs/parameters (subject + SAN hostname) ===
        const subjectCN = tenant.name;
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
                name: `CN=${subjectCN}`,
                notBefore: now,
                notAfter: inOneYear,
                signingAlgorithm: ECDSA_P256,
                keys: { publicKey, privateKey },
                extensions: [
                    new x509.SubjectAlternativeNameExtension([
                        { type: "dns", value: hostname },
                    ]),
                    new x509.KeyUsagesExtension(
                        x509.KeyUsageFlags.digitalSignature |
                            x509.KeyUsageFlags.keyEncipherment,
                        true,
                    ),
                    await x509.SubjectKeyIdentifierExtension.create(publicKey),
                ],
            });

        const crtPem = selfSignedCert.toString("pem"); // PEM-encoded certificate

        // Persist the certificate with the specified types
        const types: ("access" | "signing")[] = [];
        if (isAccessCert) types.push("access");
        if (isSigningCert) types.push("signing");
        const certEntity = await this.certRepository.save({
            id: randomUUID(),
            tenantId: tenant.id,
            crt: crtPem,
            isAccessCert,
            isSigningCert,
            description: `Self-signed certificate (${types.join(", ")}) for tenant ${tenant.name}`,
            key: { id: keyId, tenantId: tenant.id },
        });
        return certEntity.id;
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
        await this.certRepository.update(
            {
                tenantId,
                id: certId,
            },
            updates,
        );
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
     * @param value - Search criteria including tenantId, type, and optional id
     * @returns The matching certificate
     */
    find(value: {
        tenantId: string;
        type: "access" | "signing";
        id?: string;
    }): Promise<CertEntity> {
        const whereClause: any = {
            tenantId: value.tenantId,
        };

        // Map type to boolean field
        if (value.type === "access") {
            whereClause.isAccessCert = true;
        } else if (value.type === "signing") {
            whereClause.isSigningCert = true;
        }

        if (value.id) {
            whereClause.id = value.id;
        }

        return this.certRepository.findOneByOrFail(whereClause);
    }

    /**
     * Get all certificates for a tenant.
     * @param tenantId - The tenant ID
     * @returns Array of certificates
     */
    getCerts(tenantId: string): Promise<CertEntity[]> {
        return this.certRepository.findBy({
            tenantId,
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
     * Get a certificate entry by tenantId and certId.
     * @param tenantId - The tenant ID
     * @param certId - The certificate ID
     * @returns The certificate entity
     */
    getCertEntry(tenantId: string, certId: string): Promise<CertEntity> {
        return this.certRepository.findOneByOrFail({ tenantId, id: certId });
    }

    /**
     * Get the certificate string for the given tenant and certId.
     * @param tenantId - The tenant ID
     * @param certId - The certificate ID
     * @returns The certificate PEM string
     */
    getCert(tenantId: string, certId: string): Promise<string> {
        return this.certRepository
            .findOneBy({ tenantId, id: certId })
            .then((cert) => cert!.crt);
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
     * @returns Array with base64-encoded certificate
     */
    getCertChain(cert: CertEntity): string[] {
        const chain = cert.crt
            .replace("-----BEGIN CERTIFICATE-----", "")
            .replace("-----END CERTIFICATE-----", "")
            .replace(/\r?\n|\r/g, "");
        return [chain];
    }

    /**
     * Store the access certificate for the tenant.
     * @param crt - The certificate PEM string
     * @param tenantId - The tenant ID
     * @param id - The certificate ID
     */
    async storeAccessCertificate(crt: string, tenantId: string, id: string) {
        await this.certRepository.save({
            tenantId,
            id,
            crt,
            isAccessCert: true,
            isSigningCert: false,
        });
    }

    /**
     * Get the base64 url encoded SHA-256 hash of the certificate.
     * @param cert - The certificate entity
     * @returns The certificate hash as base64url encoded string
     */
    getCertHash(cert: CertEntity): string {
        // Extract DER from PEM (PEM is base64 encoded, not base64url)
        const der = Buffer.from(
            cert.crt
                .replace("-----BEGIN CERTIFICATE-----", "")
                .replace("-----END CERTIFICATE-----", "")
                .replace(/\r?\n|\r/g, ""),
            "base64",
        );
        // Hash the DER and return as base64url
        return createHash("sha256").update(der).digest("base64url");
    }

    /**
     * Imports certificates from the file system.
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
}
