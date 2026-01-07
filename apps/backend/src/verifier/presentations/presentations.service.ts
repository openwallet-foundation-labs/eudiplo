import { readFileSync } from "node:fs";
import {
    ConflictException,
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { decodeJwt } from "jose";
import { Repository } from "typeorm";
import { ServiceTypeIdentifier } from "../../issuer/trust-list/trustlist.service";
import { Session } from "../../session/entities/session.entity";
import { ConfigImportService } from "../../shared/utils/config-import/config-import.service";
import { VerifierOptions } from "../resolver/trust/types";
import { MdlverifierService } from "./credential/mdlverifier/mdlverifier.service";
import { SdjwtvcverifierService } from "./credential/sdjwtvcverifier/sdjwtvcverifier.service";
import { AuthResponse } from "./dto/auth-response.dto";
import { PresentationConfigCreateDto } from "./dto/presentation-config-create.dto";
import { PresentationConfigUpdateDto } from "./dto/presentation-config-update.dto";
import {
    PresentationConfig,
    TrustedAuthorityType,
} from "./entities/presentation-config.entity";

type CredentialType = "dc+sd-jwt" | "mso_mdoc";

/**
 * Service for managing Verifiable Presentations (VPs) and handling SD-JWT-VCs.
 */
@Injectable()
export class PresentationsService implements OnApplicationBootstrap {
    /**
     * Constructor for the PresentationsService.
     * @param httpService - Instance of HttpService for making HTTP requests.
     * @param resolverService - Instance of ResolverService for resolving DID documents.
     * @param vpRequestRepository - Repository for managing VP request configurations.
     */
    constructor(
        @InjectRepository(PresentationConfig)
        private readonly vpRequestRepository: Repository<PresentationConfig>,
        private readonly configImportService: ConfigImportService,
        private readonly sdjwtvcverifierService: SdjwtvcverifierService,
        private readonly mdlverifierService: MdlverifierService,
        private readonly configService: ConfigService,
    ) {}

    /**
     * Imports presentation configurations from a predefined directory structure.
     */
    async onApplicationBootstrap() {
        await this.import();
    }

    /**
     * Imports presentation configurations from a predefined directory structure.
     */
    private async import() {
        await this.configImportService.importConfigs<PresentationConfigCreateDto>(
            {
                subfolder: "presentation",
                fileExtension: ".json",
                validationClass: PresentationConfigCreateDto,
                resourceType: "presentation config",
                loadData: (filePath) => {
                    const payload = JSON.parse(readFileSync(filePath, "utf8"));
                    const id = (filePath.split("/").pop() || "").replace(
                        ".json",
                        "",
                    );
                    payload.id = id;
                    return plainToClass(PresentationConfigCreateDto, payload);
                },
                checkExists: (tenantId, data) => {
                    return this.getPresentationConfig(data.id, tenantId)
                        .then(() => true)
                        .catch(() => false);
                },
                deleteExisting: async (tenantId, data) => {
                    await this.vpRequestRepository.delete({
                        id: data.id,
                        tenantId,
                    });
                },
                processItem: async (tenantId, config) => {
                    await this.storePresentationConfig(tenantId, config);
                },
            },
        );
    }

    /**
     * Retrieves all presentation configurations for a given tenant.
     * @param tenantId - The ID of the tenant for which to retrieve configurations.
     * @returns A promise that resolves to an array of PresentationConfig entities.
     */
    getPresentationConfigs(tenantId: string): Promise<PresentationConfig[]> {
        return this.vpRequestRepository.find({
            where: { tenantId },
            order: { createdAt: "DESC" },
        });
    }

    /**
     * Stores a new presentation configuration.
     * @param tenantId - The ID of the tenant for which to store the configuration.
     * @param vprequest - The PresentationConfig entity to store.
     * @returns A promise that resolves to the stored PresentationConfig entity.
     */
    storePresentationConfig(
        tenantId: string,
        vprequest: PresentationConfigCreateDto,
    ) {
        return this.vpRequestRepository.save({
            ...vprequest,
            tenantId,
        });
    }

    /**
     * Updates an existing presentation configuration.
     * @param id
     * @param tenantId
     * @param vprequest
     * @returns
     */
    async updatePresentationConfig(
        id: string,
        tenantId: string,
        vprequest: PresentationConfigUpdateDto,
    ) {
        // Verify the config exists
        const existing = await this.getPresentationConfig(id, tenantId);

        // Merge existing with updates - client must explicitly set fields to null to clear them
        // Omitted fields keep their existing values
        return this.vpRequestRepository.save({
            ...existing,
            ...vprequest,
            id,
            tenantId,
        });
    }

    /**
     * Deletes a presentation configuration by its ID and tenant ID.
     * @param id - The ID of the presentation configuration to delete.
     * @param tenantId - The ID of the tenant for which to delete the configuration.
     * @returns A promise that resolves when the deletion is complete.
     */
    deletePresentationConfig(id: string, tenantId: string) {
        return this.vpRequestRepository.delete({ id, tenantId });
    }

    /**
     * Retrieves a presentation configuration by its ID and tenant ID.
     * @param id - The ID of the presentation configuration to retrieve.
     * @param tenantId - The ID of the tenant for which to retrieve the configuration.
     * @returns A promise that resolves to the requested PresentationConfig entity.
     */
    getPresentationConfig(
        id: string,
        tenantId: string,
    ): Promise<PresentationConfig> {
        return this.vpRequestRepository
            .findOneByOrFail({
                id,
                tenantId,
            })
            .catch(() => {
                throw new ConflictException(`Request ID ${id} not found`);
            });
    }

    /**
     * Stores the new registration certificate.
     * @param registrationCertId - The ID of the registration certificate to store.
     * @param id - The ID of the presentation configuration to update.
     * @param tenantId - The ID of the tenant for which to store the registration certificate.
     * @returns
     */
    public async storeRCID(
        registrationCertId: string,
        id: string,
        tenantId: string,
    ) {
        const element = await this.vpRequestRepository.findOneByOrFail({
            id,
            tenantId,
        });
        await this.vpRequestRepository.save(element);
    }

    /**
     * Parse the response from the wallet. It will verify the SD-JWT-VCs in the vp_token and return the parsed attestations.
     * @param res
     * @param requiredFields
     * @returns
     */
    async parseResponse(
        res: AuthResponse,
        presentationConfig: PresentationConfig,
        session: Session,
    ) {
        const attestationIds = Object.keys(res.vp_token);
        const host = this.configService.getOrThrow<string>("PUBLIC_URL");
        const tenantHost = `${host}/${presentationConfig.tenantId}`;

        const results = await Promise.all(
            attestationIds.map(async (attId) => {
                const credentials = res.vp_token[attId] as unknown as string[];
                const dcqlCredential =
                    presentationConfig.dcql_query.credentials.find(
                        (c) => c.id === attId,
                    );

                if (!dcqlCredential) {
                    throw new ConflictException(
                        `${attId} not found in the presentation config`,
                    );
                }

                const verifyOptions: VerifierOptions = {
                    trustListSource: {
                        lotes:
                            dcqlCredential.trusted_authorities
                                ?.find(
                                    (auth) =>
                                        auth.type ===
                                        TrustedAuthorityType.ETSI_TL,
                                )
                                ?.values.map((url) => ({
                                    url: url.replaceAll(
                                        "<TENANT_URL>",
                                        tenantHost,
                                    ),
                                })) || [],
                        acceptedServiceTypes: [
                            ServiceTypeIdentifier.EaaIssuance,
                        ],
                    },
                    policy: {
                        requireX5c: true,
                    },
                };

                const type = this.getType(session.requestObject!, attId);

                const values = await Promise.all(
                    credentials.map(async (cred) => {
                        if (type === "mso_mdoc") {
                            const result = await this.mdlverifierService.verify(
                                cred,
                                {
                                    nonce: session.vp_nonce as string,
                                    clientId: session.clientId!,
                                    responseUri: session.responseUri!,
                                    protocol: "openid4vp",
                                    responseMode: session.useDcApi
                                        ? "dc_api.jwt"
                                        : "direct_post.jwt",
                                },
                                verifyOptions,
                            );
                            return {
                                ...result.claims,
                                payload: result.payload,
                            };
                        } else if (type === "dc+sd-jwt") {
                            const result =
                                await this.sdjwtvcverifierService.verify(cred, {
                                    requiredClaimKeys: [],
                                    keyBindingNonce: session.vp_nonce!,
                                    ...verifyOptions,
                                } as any);
                            return {
                                ...result.payload,
                                cnf: undefined,
                                status: undefined,
                            };
                        }
                        throw new ConflictException(
                            `Unsupported credential type: ${type}`,
                        );
                    }),
                );

                return { id: attId, values };
            }),
        );

        return results;
    }

    /**
     * Get the credential type based on the configuration id.
     * @param jwt
     * @param att
     * @returns
     */
    getType(jwt: string, att: string): CredentialType {
        const payload = decodeJwt<any>(jwt);
        return payload.dcql_query.credentials.find(
            (credential) => credential.id === att,
        ).format;
    }
}
