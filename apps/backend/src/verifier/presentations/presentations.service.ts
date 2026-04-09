import { readFileSync } from "node:fs";
import { ConflictException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { base64url, decodeJwt } from "jose";
import { Span } from "nestjs-otel";
import { Repository } from "typeorm";
import { ServiceTypeIdentifier } from "../../issuer/trust-list/trustlist.service";
import { Session } from "../../session/entities/session.entity";
import { VerifierOptions } from "../../shared/trust/types";
import { ConfigImportService } from "../../shared/utils/config-import/config-import.service";
import {
    ConfigImportOrchestratorService,
    ImportPhase,
} from "../../shared/utils/config-import/config-import-orchestrator.service";
import { MdocverifierService } from "./credential/mdocverifier/mdocverifier.service";
import { SdjwtvcverifierService } from "./credential/sdjwtvcverifier/sdjwtvcverifier.service";
import { AuthResponse } from "./dto/auth-response.dto";
import { PresentationConfigCreateDto } from "./dto/presentation-config-create.dto";
import { PresentationConfigUpdateDto } from "./dto/presentation-config-update.dto";
import {
    ClaimsQuery,
    CredentialQuery,
    CredentialSetQuery,
    PresentationConfig,
    TrustedAuthorityType,
} from "./entities/presentation-config.entity";
import { IncompletePresentationException } from "./exceptions/incomplete-presentation.exception";

type CredentialType = "dc+sd-jwt" | "mso_mdoc";

/**
 * Service for managing Verifiable Presentations (VPs) and handling SD-JWT-VCs.
 */
@Injectable()
export class PresentationsService {
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
        private readonly configImportOrchestrator: ConfigImportOrchestratorService,
        private readonly sdjwtvcverifierService: SdjwtvcverifierService,
        private readonly mdocverifierService: MdocverifierService,
        private readonly configService: ConfigService,
    ) {
        // Register presentation config import in REFERENCES phase
        // This runs after CORE (keys, certs) and CONFIGURATION phases
        this.configImportOrchestrator.register(
            "presentation-configs",
            ImportPhase.REFERENCES,
            (tenantId) => this.importForTenant(tenantId),
        );
    }

    /**
     * Imports presentation configurations for a specific tenant.
     */
    private async importForTenant(tenantId: string) {
        await this.configImportService.importConfigsForTenant<PresentationConfigCreateDto>(
            tenantId,
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
                checkExists: (tid, data) => {
                    return this.getPresentationConfig(data.id, tid)
                        .then(() => true)
                        .catch(() => false);
                },
                deleteExisting: async (tid, data) => {
                    await this.vpRequestRepository.delete({
                        id: data.id,
                        tenantId: tid,
                    });
                },
                processItem: async (tid, config) => {
                    await this.storePresentationConfig(tid, config);
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
    @Span("presentations.parseResponse")
    async parseResponse(
        res: AuthResponse,
        presentationConfig: PresentationConfig,
        session: Session,
    ) {
        const attestationIds = Object.keys(res.vp_token);
        const host = this.configService.getOrThrow<string>("PUBLIC_URL");
        const tenantHost = `${host}/${presentationConfig.tenantId}`;

        // Validate credential completeness - ensure all required credentials are present
        this.validateCredentialCompleteness(
            attestationIds,
            presentationConfig.dcql_query.credentials,
            presentationConfig.dcql_query.credential_sets,
        );

        // Get transaction_data from the request object JWT payload
        // This ensures we use the exact same encoded strings that were sent to the wallet
        let transactionDataStrings: string[] | undefined;
        if (session.requestObject) {
            const requestPayload = decodeJwt(session.requestObject) as {
                transaction_data?: string[];
            };
            transactionDataStrings = requestPayload.transaction_data;
        }

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

                // Find transaction data entries that reference this credential
                // The strings are already base64url-encoded from the request object
                // We need to decode them to check credential_ids, then use the original encoded string for hash validation
                const relevantTransactionData = transactionDataStrings?.filter(
                    (tdStr) => {
                        try {
                            const td = JSON.parse(
                                Buffer.from(base64url.decode(tdStr)).toString(),
                            ) as { credential_ids?: string[] };
                            return td.credential_ids?.includes(attId);
                        } catch {
                            return false;
                        }
                    },
                );

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
                            ServiceTypeIdentifier.PIDIssuance,
                        ],
                    },
                    policy: {
                        requireX5c: true,
                    },
                    // Pass transaction data for hash validation (only for credentials that have it)
                    transactionData: relevantTransactionData,
                };

                const type = this.getType(session.requestObject!, attId);

                // Extract required claim keys from DCQL claims
                const requiredClaimKeys = this.getRequiredClaimKeys(
                    dcqlCredential.claims,
                    type,
                );

                const values = await Promise.all(
                    credentials.map(async (cred) => {
                        if (type === "mso_mdoc") {
                            const result =
                                await this.mdocverifierService.verify(
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

                            // Validate all required claims are present in mDOC
                            this.validateMdocClaims(
                                attId,
                                dcqlCredential.claims,
                                result.claims,
                            );

                            return result.claims;
                        } else if (type === "dc+sd-jwt") {
                            const result =
                                await this.sdjwtvcverifierService.verify(cred, {
                                    requiredClaimKeys,
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

    /**
     * Validates that the presentation response contains all required credentials.
     * If credential_sets are defined, validates that at least one option set is fully satisfied.
     * If no credential_sets are defined, all credentials in the query are required.
     *
     * @param receivedCredentialIds - Array of credential IDs received in the response
     * @param requiredCredentials - Array of credential queries from DCQL
     * @param credentialSets - Optional credential set queries from DCQL
     * @throws IncompletePresentationException if validation fails
     */
    private validateCredentialCompleteness(
        receivedCredentialIds: string[],
        requiredCredentials: CredentialQuery[],
        credentialSets?: CredentialSetQuery[],
    ): void {
        const allCredentialIds = requiredCredentials.map((c) => c.id);
        const receivedSet = new Set(receivedCredentialIds);

        if (credentialSets && credentialSets.length > 0) {
            // Validate credential_sets - for each required set, at least one option must be satisfied
            const unsatisfiedSets: number[] = [];

            for (let i = 0; i < credentialSets.length; i++) {
                const credentialSet = credentialSets[i];

                // Default to required if not explicitly set to false
                if (credentialSet.required === false) {
                    continue;
                }

                // Check if at least one option set is fully satisfied
                const isSatisfied = credentialSet.options.some((optionSet) =>
                    optionSet.every((credId) => receivedSet.has(credId)),
                );

                if (!isSatisfied) {
                    unsatisfiedSets.push(i);
                }
            }

            if (unsatisfiedSets.length > 0) {
                throw new IncompletePresentationException(
                    `Credential sets not satisfied: ${unsatisfiedSets.map((i) => `set[${i}]`).join(", ")}`,
                    { unsatisfiedCredentialSets: unsatisfiedSets },
                );
            }
        } else {
            // No credential_sets defined - all credentials in the query are required
            const missingCredentials = allCredentialIds.filter(
                (id) => !receivedSet.has(id),
            );

            if (missingCredentials.length > 0) {
                throw new IncompletePresentationException(
                    `Missing required credentials: ${missingCredentials.join(", ")}`,
                    { missingCredentials },
                );
            }
        }
    }

    /**
     * Converts DCQL claim queries to required claim keys for verification.
     *
     * For SD-JWT-VC: paths are joined with dots (e.g., ["address", "locality"] -> "address.locality")
     * For mDOC: the first path element is the namespace, so we return the claim name (second element)
     *
     * @param claims - Array of claim queries from DCQL
     * @param credentialType - The type of credential ("dc+sd-jwt" or "mso_mdoc")
     * @returns Array of required claim keys in the format expected by the verifier
     */
    private getRequiredClaimKeys(
        claims: ClaimsQuery[] | undefined,
        credentialType: CredentialType,
    ): string[] {
        if (!claims || claims.length === 0) {
            return [];
        }

        return claims.map((claim) => {
            if (credentialType === "mso_mdoc") {
                // For mDOC, path is [namespace, claimName]
                // We return just the claim name for internal tracking
                // Actual validation happens in validateMdocClaims
                return claim.path.length > 1
                    ? claim.path.slice(1).join(".")
                    : claim.path[0];
            }
            // For SD-JWT-VC, join path with dots
            return claim.path.join(".");
        });
    }

    /**
     * Validates that all required claims from the DCQL query are present in the mDOC response.
     *
     * @param credentialId - The credential ID for error reporting
     * @param requiredClaims - Array of claim queries from DCQL
     * @param receivedClaims - Claims received in the mDOC response
     * @throws IncompletePresentationException if any required claims are missing
     */
    private validateMdocClaims(
        credentialId: string,
        requiredClaims: ClaimsQuery[] | undefined,
        receivedClaims: Record<string, unknown>,
    ): void {
        if (!requiredClaims || requiredClaims.length === 0) {
            return;
        }

        const missingClaims: string[] = [];

        for (const claim of requiredClaims) {
            // For mDOC, path is [namespace, claimName] or just [claimName]
            // The verifier already flattens claims from all namespaces
            const claimName =
                claim.path.length > 1 ? claim.path[1] : claim.path[0];

            // Check if claim exists in received claims
            if (!(claimName in receivedClaims)) {
                // Format as namespace.claimName for better error message
                const fullPath = claim.path.join(".");
                missingClaims.push(fullPath);
            }
        }

        if (missingClaims.length > 0) {
            throw new IncompletePresentationException(
                `Missing required claims for credential '${credentialId}': ${missingClaims.join(", ")}`,
                { missingClaims: { [credentialId]: missingClaims } },
            );
        }
    }
}
