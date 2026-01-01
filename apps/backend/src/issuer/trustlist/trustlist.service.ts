import { readFileSync } from "node:fs";
import { Inject, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { JWTHeaderParameters } from "jose";
import { Repository } from "typeorm";
import { TenantEntity } from "../../auth/tenant/entitites/tenant.entity";
import { CertService } from "../../crypto/key/cert/cert.service";
import { CertEntity } from "../../crypto/key/entities/cert.entity";
import { CertUsage } from "../../crypto/key/entities/cert-usage.entity";
import { KeyService } from "../../crypto/key/key.service";
import { ConfigImportService } from "../../shared/utils/config-import/config-import.service";
import { TrustListCreateDto } from "./dto/trust-list-create.dto";
import { LoTE, TrustedEntitiesList, TrustedEntity } from "./dto/types";
import { TrustList } from "./entities/trust-list.entity";

export enum ServiceTypeIdentifier {
    EaaIssuance = "http://uri.etsi.org/19602/SvcType/EAA/Issuance",
    EaaRevocation = "http://uri.etsi.org/19602/SvcType/EAA/Revocation",
}

@Injectable()
export class TrustListService implements OnApplicationBootstrap {
    constructor(
        @InjectRepository(TrustList)
        private readonly trustListRepo: Repository<TrustList>,
        @Inject("KeyService") public readonly keyService: KeyService,
        private readonly certService: CertService,
        private readonly configImportService: ConfigImportService,
        @InjectRepository(TenantEntity)
        private readonly tenantRepository: Repository<TenantEntity>,
    ) {}

    /**
     * Imports trust lists from the file system.
     */
    async onApplicationBootstrap() {
        await this.importList();
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

    /**
     * Update trust list data
     * @param tenantId
     * @param id
     * @param data
     * @returns
     */
    async update(
        tenantId: string,
        id: string,
        data: object,
    ): Promise<TrustList> {
        await this.trustListRepo.update({ tenantId, id }, { data });
        return this.findOne(tenantId, id);
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
     * Imports certificates from the file system.
     */
    async importList() {
        await this.configImportService.importConfigs<TrustListCreateDto>({
            subfolder: "trustlists",
            fileExtension: ".json",
            validationClass: TrustListCreateDto,
            resourceType: "trustlist",
            loadData: (filePath) => {
                const payload = JSON.parse(readFileSync(filePath, "utf8"));
                return plainToClass(TrustListCreateDto, payload);
            },
            checkExists: (tenantId, data) => {
                return this.findOne(tenantId, data.id)
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
        });
    }
    /**
     * Shared logic for creating and saving a trust list (used by both API and import)
     */
    private async buildAndSaveTrustList(
        config: TrustListCreateDto,
        tenant: TenantEntity,
    ): Promise<TrustList> {
        let cert: CertEntity;
        if (config.certId) {
            cert = await this.certService.getCertificateById(
                tenant.id,
                config.certId,
            );
            if (!cert.usages.some((c) => c.usage === CertUsage.TrustList)) {
                throw new Error(
                    `Certificate ${config.certId} is not valid for Trust List usage`,
                );
            }
        } else {
            cert = await this.certService.findOrCreate({
                tenantId: tenant.id,
                type: CertUsage.TrustList,
            });
        }

        const trustList = this.trustListRepo.create({
            ...config,
            cert,
            tenant,
        });

        const entries: TrustedEntity[] = [];
        for (const entity of config.entities) {
            const issuerCert = await this.certService.find({
                tenantId: tenant.id,
                type: CertUsage.Signing,
                id: entity.issuerCertId,
            });
            const revocationCert = await this.certService.find({
                tenantId: tenant.id,
                type: CertUsage.StatusList,
                id: entity.revocationCertId,
            });
            entries.push(this.createEntity(issuerCert, revocationCert));
        }

        trustList.data = this.createList(tenant, entries);
        trustList.jwt = await this.generateJwt(trustList);
        return this.trustListRepo.save(trustList);
    }

    /**
     * Get the JWT of the trust list
     * @param tenantId
     * @param id
     * @returns
     */
    getJwt(tenantId: string, id: string): Promise<string> {
        return this.findOne(tenantId, id).then((trustList) => trustList.jwt);
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

    private createEntity(
        issuerCert: CertEntity,
        revocationCert: CertEntity,
    ): TrustedEntity {
        return {
            TrustedEntityInformation: {
                TEInformationURI: [
                    {
                        lang: "de-DE",
                        uriValue: "https://www.bdr.de",
                    },
                ],
                TEName: [
                    {
                        lang: "de-DE",
                        value: "Bundesdruckerei GmbH",
                    },
                ],
                TEAddress: {
                    TEElectronicAddress: [
                        {
                            lang: "de-DE",
                            uriValue: "https://bdr.de/contact",
                        },
                    ],
                    TEPostalAddress: [
                        {
                            Country: "DE",
                            lang: "de",
                            Locality: "Berlin",
                            PostalCode: "10787",
                            StreetAddress: "Kommandantenstraße 18",
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
                                lang: "de-DE",
                                value: "EAA-Issuance-Service",
                            },
                        ],
                        ServiceDigitalIdentity: {
                            X509Certificates: [
                                {
                                    val: this.formatCert(issuerCert),
                                },
                            ],
                        },
                    },
                },
                {
                    ServiceInformation: {
                        ServiceName: [
                            {
                                lang: "de-DE",
                                value: "EAA-Revocation-Service",
                            },
                        ],
                        ServiceTypeIdentifier:
                            ServiceTypeIdentifier.EaaRevocation,
                        ServiceDigitalIdentity: {
                            X509Certificates: [
                                {
                                    val: this.formatCert(revocationCert),
                                },
                            ],
                        },
                    },
                },
            ],
        };
    }

    createList(tenant: TenantEntity, list: TrustedEntity[]): LoTE {
        const date = new Date();
        const nextUpdate = new Date();
        nextUpdate.setDate(date.getDate() + 30);

        return {
            ListAndSchemeInformation: {
                LoTEVersionIdentifier: 1,
                LoTESequenceNumber: 1,
                LoTEType:
                    "http://uri.etsi.org/19602/LoTEType/EUEAAProvidersList",
                StatusDeterminationApproach:
                    "http://uri.etsi.org/19602/EUEAAProvidersList/StatusDetn/EU",
                SchemeTypeCommunityRules: [
                    {
                        lang: "de-DE",
                        uriValue:
                            "http://uri.etsi.org/19602/EUEAAProviders/schemerules/EU",
                    },
                ],
                SchemeTerritory: "EU",
                NextUpdate: nextUpdate.toISOString(),
                SchemeOperatorName: [
                    {
                        lang: "de-DE",
                        value: tenant.name,
                    },
                ],
                ListIssueDateTime: date.toISOString(),
            },
            TrustedEntitiesList: list as TrustedEntitiesList,
        };
    }

    /**
     * Format certificate to base64 DER without PEM headers
     * @param cert
     * @returns
     */
    formatCert(cert: CertEntity): string {
        return cert.crt
            .replaceAll("-----BEGIN CERTIFICATE-----", "")
            .replaceAll("-----END CERTIFICATE-----", "")
            .replaceAll(/\r?\n|\r/g, "");
    }
}
