import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as x509 from "@peculiar/x509";
import { randomUUID } from "crypto";
import { importJWK } from "jose";
import { Repository } from "typeorm";
import { v4 } from "uuid";
import { TenantEntity } from "../../../auth/tenant/entitites/tenant.entity";
import { CertImportDto } from "../dto/cert-import.dto";
import { CertUpdateDto } from "../dto/cert-update.dto";
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
            type: dto.type as any,
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
        types: ("access" | "signing")[],
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
        const certEntity = await this.certRepository.save({
            id: randomUUID(),
            tenantId: tenant.id,
            crt: crtPem,
            type: types as any,
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
}
