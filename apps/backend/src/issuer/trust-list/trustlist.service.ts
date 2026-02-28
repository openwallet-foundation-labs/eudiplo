import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { JWTHeaderParameters } from "jose";
import { Repository } from "typeorm";
import { v4 } from "uuid";
import { TenantEntity } from "../../auth/tenant/entitites/tenant.entity";
import { CertService } from "../../crypto/key/cert/cert.service";
import { CertEntity } from "../../crypto/key/entities/cert.entity";
import { CertUsage } from "../../crypto/key/entities/cert-usage.entity";
import { KeyService } from "../../crypto/key/key.service";
import { ConfigImportService } from "../../shared/utils/config-import/config-import.service";
import {
    ConfigImportOrchestratorService,
    ImportPhase,
} from "../../shared/utils/config-import/config-import-orchestrator.service";
import {
    TrustListCreateDto,
    TrustListEntityInfo,
} from "./dto/trust-list-create.dto";
import { LoTE, TrustedEntitiesList, TrustedEntity } from "./dto/types";
import { TrustList } from "./entities/trust-list.entity";
import { TrustListVersion } from "./entities/trust-list-version.entity";

export enum ServiceTypeIdentifier {
    PIDIssuance = "http://uri.etsi.org/19602/SvcType/PID/Issuance",
    PIDRevocation = "http://uri.etsi.org/19602/SvcType/PID/Revocation",
    EaaIssuance = "http://uri.etsi.org/19602/SvcType/EAA/Issuance",
    EaaRevocation = "http://uri.etsi.org/19602/SvcType/EAA/Revocation",
}

/** Default language for trust list entries */
const DEFAULT_LANG = "en";

@Injectable()
export class TrustListService {
    constructor(
        @InjectRepository(TrustList)
        private readonly trustListRepo: Repository<TrustList>,
        @InjectRepository(TrustListVersion)
        private readonly trustListVersionRepo: Repository<TrustListVersion>,
        public readonly keyService: KeyService,
        private readonly certService: CertService,
        private readonly configImportService: ConfigImportService,
        @InjectRepository(TenantEntity)
        private readonly tenantRepository: Repository<TenantEntity>,
        configImportOrchestrator: ConfigImportOrchestratorService,
    ) {
        configImportOrchestrator.register(
            "status-lists",
            ImportPhase.FINAL,
            (tenantId) => this.importForTenant(tenantId),
        );
    }

    /**
     * Create a new trust list
     * @param values
     * @param tenant
     * @returns
     */
    create(
        values: TrustListCreateDto,
        tenant: TenantEntity,
    ): Promise<TrustList> {
        return this.buildAndSaveTrustList(values, tenant);
    }

    /**
     * Finds all trust lists for the tenant
     * @param tenant
     * @returns
     */
    findAll(tenant: TenantEntity): Promise<TrustList[]> {
        return this.trustListRepo.findBy({ tenantId: tenant.id });
    }

    /**
     * Find one trust list by tenantId and id
     * @param tenantId
     * @param id
     * @returns
     */
    findOne(tenantId: string, id: string): Promise<TrustList> {
        return this.trustListRepo.findOneByOrFail({ tenantId, id });
    }

    async exportTrustList(
        tenantId: string,
        id: string,
    ): Promise<TrustListCreateDto> {
        const entry = await this.findOne(tenantId, id);
        return {
            id: entry.id,
            description: entry.description,
            certId: entry.certId,
            entities: entry.entityConfig ?? [],
            data: entry.data,
        };
    }

    /**
     * Update a trust list with new entities
     * Increments the sequence number and stores a version for audit
     * @param tenantId
     * @param id
     * @param values
     * @returns
     */
    async update(
        tenantId: string,
        id: string,
        values: TrustListCreateDto,
    ): Promise<TrustList> {
        const existing = await this.findOne(tenantId, id);
        const tenant = await this.tenantRepository.findOneByOrFail({
            id: tenantId,
        });

        // Store the current version for audit before updating
        await this.saveVersion(existing);

        // Update the trust list
        return this.buildAndSaveTrustList(values, tenant, existing);
    }

    /**
     * Get version history for a trust list
     * @param tenantId
     * @param trustListId
     * @returns
     */
    getVersionHistory(
        tenantId: string,
        trustListId: string,
    ): Promise<TrustListVersion[]> {
        return this.trustListVersionRepo.find({
            where: { tenantId, trustListId },
            order: { sequenceNumber: "DESC" },
        });
    }

    /**
     * Get a specific version of a trust list
     * @param tenantId
     * @param trustListId
     * @param versionId
     * @returns
     */
    getVersion(
        tenantId: string,
        trustListId: string,
        versionId: string,
    ): Promise<TrustListVersion> {
        return this.trustListVersionRepo.findOneByOrFail({
            tenantId,
            trustListId,
            id: versionId,
        });
    }

    /**
     * Remove a trust list
     * @param tenantId
     * @param id
     */
    async remove(tenantId: string, id: string): Promise<void> {
        await this.trustListRepo.delete({ tenantId, id });
    }

    /**
     * Imports trust lists for a specific tenant from the file system.
     */
    async importForTenant(tenantId: string) {
        await this.configImportService.importConfigsForTenant<TrustListCreateDto>(
            tenantId,
            {
                subfolder: "trust-lists",
                fileExtension: ".json",
                validationClass: TrustListCreateDto,
                resourceType: "trustlist",
                loadData: (filePath) => {
                    const payload = JSON.parse(readFileSync(filePath, "utf8"));
                    return plainToClass(TrustListCreateDto, payload);
                },
                checkExists: (tenantId, data) => {
                    return this.findOne(tenantId, data.id!)
                        .then(() => true)
                        .catch(() => false);
                },
                deleteExisting: async (tenantId, data) => {
                    await this.trustListRepo.delete({
                        id: data.id,
                        tenantId,
                    });
                },
                processItem: async (tenantId, config) => {
                    const tenant = await this.tenantRepository.findOneByOrFail({
                        id: tenantId,
                    });
                    await this.buildAndSaveTrustList(config, tenant);
                },
            },
        );
    }
    /**
     * Shared logic for creating and saving a trust list (used by both API and import)
     * @param config The configuration for the trust list
     * @param tenant The tenant entity
     * @param existing Optional existing trust list to update
     */
    private async buildAndSaveTrustList(
        config: TrustListCreateDto,
        tenant: TenantEntity,
        existing?: TrustList,
    ): Promise<TrustList> {
        // Validate PEM certificates for external entities
        for (const entity of config.entities || []) {
            if (entity.type === "external") {
                this.validatePem(entity.issuerCertPem, "issuerCertPem");
                this.validatePem(entity.revocationCertPem, "revocationCertPem");
            }
        }

        let cert: CertEntity;
        if (config.certId) {
            cert = await this.certService.getCertificateById(
                tenant.id,
                config.certId,
            );
            if (!cert.usages.some((c) => c.usage === CertUsage.TrustList)) {
                throw new BadRequestException(
                    `Certificate ${config.certId} is not valid for Trust List usage`,
                );
            }
        } else if (existing?.cert) {
            cert = existing.cert;
        } else {
            cert = await this.certService.findOrCreate({
                tenantId: tenant.id,
                type: CertUsage.TrustList,
            });
        }

        // Use existing trust list or create new
        const trustList =
            existing ??
            this.trustListRepo.create({ tenant, id: config.id ?? v4() });

        // Update properties
        trustList.description = config.description;
        trustList.cert = cert;
        trustList.entityConfig = config.entities;

        // Increment sequence number on updates
        if (existing) {
            trustList.sequenceNumber = (existing.sequenceNumber || 1) + 1;
        } else {
            trustList.sequenceNumber = 1;
        }

        const entries: TrustedEntity[] = [];
        for (const entity of config.entities || []) {
            if (entity.type === "internal") {
                // Internal: fetch certificates from database by ID
                const issuerCert = await this.certService.getCertificateById(
                    tenant.id,
                    entity.issuerCertId,
                );
                const revocationCert =
                    await this.certService.getCertificateById(
                        tenant.id,
                        entity.revocationCertId,
                    );
                entries.push(
                    this.createEntityFromCert(
                        issuerCert,
                        revocationCert,
                        entity.info,
                    ),
                );
            } else {
                // External: use PEM certificates directly with provided info
                entries.push(
                    this.createEntityFromPem(
                        entity.issuerCertPem,
                        entity.revocationCertPem,
                        entity.info,
                    ),
                );
            }
        }

        trustList.data = this.createList(
            tenant,
            entries,
            trustList.sequenceNumber,
        );
        trustList.jwt = await this.generateJwt(trustList);
        return this.trustListRepo.save(trustList);
    }

    /**
     * Save the current state of a trust list as a version for audit
     */
    private saveVersion(trustList: TrustList): Promise<TrustListVersion> {
        const version = this.trustListVersionRepo.create({
            trustListId: trustList.id,
            tenantId: trustList.tenantId,
            sequenceNumber: trustList.sequenceNumber || 1,
            data: trustList.data ?? {},
            entityConfig: trustList.entityConfig,
            jwt: trustList.jwt,
        });
        return this.trustListVersionRepo.save(version);
    }

    /**
     * Validate that a string is a valid PEM certificate
     * @param pem The PEM string to validate
     * @param fieldName The field name for error messages
     */
    private validatePem(pem: string, fieldName: string): void {
        if (!pem || pem.trim() === "") {
            throw new BadRequestException(`${fieldName} is required`);
        }
        try {
            new X509Certificate(pem);
        } catch {
            throw new BadRequestException(
                `${fieldName} is not a valid X.509 certificate`,
            );
        }
    }

    /**
     * Get the JWT of the trust list
     * @param tenantId
     * @param id
     * @returns
     */
    getJwt(tenantId: string, id: string): Promise<string> {
        return this.findOne(tenantId, id).then(
            (trustList) => trustList.jwt,
            (err) => {
                throw new BadRequestException(err.message);
            },
        );
    }

    /**
     * Generate a signed JWT for the trust list
     * @param id
     * @returns
     */
    async generateJwt(trustList: TrustList): Promise<string> {
        const cert = await this.certService.find({
            tenantId: trustList.tenantId,
            type: CertUsage.TrustList,
        });

        // Prepare payload and header
        const payload = { ...trustList.data };
        const protectedHeader: JWTHeaderParameters = {
            alg: "ES256",
            iat: Math.floor(Date.now() / 1000),
            typ: "JWT",
            x5c: this.certService.getCertChain(cert),
        };

        return this.keyService.signJWT(
            payload,
            protectedHeader,
            trustList.tenantId,
            cert.keyId,
        );
    }

    private createEntityFromCert(
        issuerCert: CertEntity,
        revocationCert: CertEntity,
        info: TrustListEntityInfo,
    ): TrustedEntity {
        return this.createEntityFromData(
            this.formatCertEntity(issuerCert),
            this.formatCertEntity(revocationCert),
            info,
        );
    }

    private createEntityFromPem(
        issuerCertPem: string,
        revocationCertPem: string,
        info: TrustListEntityInfo,
    ): TrustedEntity {
        return this.createEntityFromData(
            this.formatPem(issuerCertPem),
            this.formatPem(revocationCertPem),
            info,
        );
    }

    private createEntityFromData(
        issuerCertBase64: string,
        revocationCertBase64: string,
        info: TrustListEntityInfo,
    ): TrustedEntity {
        const lang = info.lang || DEFAULT_LANG;
        return {
            TrustedEntityInformation: {
                TEInformationURI: [
                    {
                        lang,
                        uriValue: info.uri || "",
                    },
                ],
                TEName: [
                    {
                        lang,
                        value: info.name,
                    },
                ],
                TEAddress: {
                    TEElectronicAddress: [
                        {
                            lang,
                            uriValue: info.contactUri || "",
                        },
                    ],
                    TEPostalAddress: [
                        {
                            Country: info.country || "",
                            lang: lang.split("-")[0], // Use short lang code for postal
                            Locality: info.locality || "",
                            PostalCode: info.postalCode || "",
                            StreetAddress: info.streetAddress || "",
                        },
                    ],
                },
            },
            TrustedEntityServices: [
                {
                    ServiceInformation: {
                        ServiceTypeIdentifier:
                            ServiceTypeIdentifier.EaaIssuance,
                        ServiceName: [
                            {
                                lang,
                                value: "EAA-Issuance-Service",
                            },
                        ],
                        ServiceDigitalIdentity: {
                            X509Certificates: [
                                {
                                    val: issuerCertBase64,
                                },
                            ],
                        },
                    },
                },
                {
                    ServiceInformation: {
                        ServiceName: [
                            {
                                lang,
                                value: "EAA-Revocation-Service",
                            },
                        ],
                        ServiceTypeIdentifier:
                            ServiceTypeIdentifier.EaaRevocation,
                        ServiceDigitalIdentity: {
                            X509Certificates: [
                                {
                                    val: revocationCertBase64,
                                },
                            ],
                        },
                    },
                },
            ],
        };
    }

    createList(
        tenant: TenantEntity,
        list: TrustedEntity[],
        sequenceNumber = 1,
    ): LoTE {
        const date = new Date();
        const nextUpdate = new Date();
        nextUpdate.setDate(date.getDate() + 30);

        return {
            ListAndSchemeInformation: {
                LoTEVersionIdentifier: 1,
                LoTESequenceNumber: sequenceNumber,
                LoTEType:
                    "http://uri.etsi.org/19602/LoTEType/EUEAAProvidersList",
                StatusDeterminationApproach:
                    "http://uri.etsi.org/19602/EUEAAProvidersList/StatusDetn/EU",
                SchemeTypeCommunityRules: [
                    {
                        lang: DEFAULT_LANG,
                        uriValue:
                            "http://uri.etsi.org/19602/EUEAAProviders/schemerules/EU",
                    },
                ],
                //TODO: add historical endpoint
                SchemeTerritory: "EU",
                NextUpdate: nextUpdate.toISOString(),
                SchemeOperatorName: [
                    {
                        lang: DEFAULT_LANG,
                        value: tenant.name,
                    },
                ],
                ListIssueDateTime: date.toISOString(),
            },
            TrustedEntitiesList: list as TrustedEntitiesList,
        };
    }

    /**
     * Format CertEntity to base64 DER without PEM headers
     * Uses the first certificate (leaf) from the chain.
     * @param cert
     * @returns
     */
    formatCertEntity(cert: CertEntity): string {
        return this.formatPem(cert.crt[0]);
    }

    /**
     * Format PEM string to base64 DER without PEM headers
     * @param pem
     * @returns
     */
    formatPem(pem: string): string {
        return pem
            .replaceAll("-----BEGIN CERTIFICATE-----", "")
            .replaceAll("-----END CERTIFICATE-----", "")
            .replaceAll(/\r?\n|\r/g, "");
    }
}
