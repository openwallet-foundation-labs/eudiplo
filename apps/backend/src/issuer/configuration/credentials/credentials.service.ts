import { ConflictException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import type { Jwk } from "@openid4vc/oauth2";
import { CredentialConfigurationSupported } from "@openid4vc/openid4vci";
import Ajv from "ajv/dist/2020";
import { Repository } from "typeorm";
import { CryptoImplementationService } from "../../../crypto/key/crypto-implementation/crypto-implementation.service";
import { Session } from "../../../session/entities/session.entity";
import { SessionLogContext } from "../../../shared/utils/logger/session-logger-context";
import { WebhookService } from "../../../shared/utils/webhook/webhook.service";
import { VCT } from "../../issuance/oid4vci/metadata/dto/vct.dto";
import { CredentialConfig } from "./entities/credential.entity";
import { MdocIssuerService } from "./issuer/mdoc-issuer/mdoc-issuer.service";
import { SdjwtvcIssuerService } from "./issuer/sdjwtvc-issuer/sdjwtvc-issuer.service";

/**
 * Service for managing credentials and their configurations.
 * Delegates actual credential issuance to format-specific services.
 */
@Injectable()
export class CredentialsService {
    /**
     * Constructor for CredentialsService.
     * @param configService
     * @param credentialConfigRepo
     * @param webhookService
     * @param sdjwtvcIssuerService
     * @param mdocIssuerService
     * @param cryptoImplementationService
     */
    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(CredentialConfig)
        private readonly credentialConfigRepo: Repository<CredentialConfig>,
        private readonly webhookService: WebhookService,
        private readonly sdjwtvcIssuerService: SdjwtvcIssuerService,
        private readonly mdocIssuerService: MdocIssuerService,
        private readonly cryptoImplementationService: CryptoImplementationService,
    ) {}

    /**
     * Returns the credential configuration that is required for oid4vci
     * @param tenantId
     * @returns
     */
    async getCredentialConfigurationSupported(
        tenantId: string,
    ): Promise<Record<string, CredentialConfigurationSupported>> {
        const credential_configurations_supported: Record<
            string,
            CredentialConfigurationSupported
        > = {};

        const configs = await this.credentialConfigRepo.findBy({
            tenantId,
        });

        //add key binding when required:
        const kb = {
            proof_types_supported: {
                jwt: {
                    proof_signing_alg_values_supported: [
                        this.cryptoImplementationService.getAlg(),
                    ],
                },
            },
            credential_signing_alg_values_supported: [
                this.cryptoImplementationService.getAlg(),
            ],
            cryptographic_binding_methods_supported: ["jwk"],
        };

        for (const value of configs) {
            // vct can be a string URI, an object, or null (for mDOC)
            if (value.vct && typeof value.vct === "object") {
                // Generate URL for object-based vct
                (
                    value.config as unknown as CredentialConfigurationSupported
                ).vct =
                    `${this.configService.getOrThrow<string>("PUBLIC_URL")}/${tenantId}/credentials-metadata/vct/${value.id}`;
            } else if (typeof value.vct === "string") {
                // Use the string URI directly
                (
                    value.config as unknown as CredentialConfigurationSupported
                ).vct = value.vct;
            }

            if (value.embeddedDisclosurePolicy) {
                delete (value.embeddedDisclosurePolicy as any).$schema;
                (
                    value.config as unknown as CredentialConfigurationSupported
                ).disclosure_policy = value.embeddedDisclosurePolicy;
            }

            // For mso_mdoc format, map docType to doctype (OID4VCI spec uses lowercase)
            if (value.config.format === "mso_mdoc" && value.config.docType) {
                (value.config as any).doctype = value.config.docType;
                delete (value.config as any).docType;
            }

            value.config = {
                ...value.config,
                ...kb,
            };
            (
                credential_configurations_supported as CredentialConfigurationSupported
            )[value.id] = value.config;
        }
        return credential_configurations_supported;
    }

    /**
     * Validates the provided claims against the schema defined in the credential configuration.
     * @param credentialConfigurationId
     * @param claims
     * @returns
     */
    validateClaimsForCredential(
        credentialConfigurationId: string,
        claims: Record<string, unknown>,
    ) {
        // AJV instance with draft 2020-12 meta-schema support.
        // removeAdditional:"all" ensures only schema-declared properties remain on the claims object.
        const ajv = new Ajv({
            allErrors: true,
            strict: true,
            removeAdditional: "all", // strip properties not defined in the schema
            useDefaults: true, // optionally apply default values from schema
        });
        //fetch the credential configuration
        return this.credentialConfigRepo
            .findOneByOrFail({ id: credentialConfigurationId })
            .then((credentialConfiguration) => {
                //if a schema is defined, validate the claims against it
                if (credentialConfiguration.schema) {
                    const validate = ajv.compile(
                        credentialConfiguration.schema,
                    );
                    const valid = validate(claims); // claims mutated: unknown props removed, defaults applied
                    if (!valid) {
                        throw new ConflictException(
                            `Claims do not conform to the schema for credential configuration with id ${credentialConfigurationId}: ${ajv.errorsText(
                                validate.errors,
                            )}`,
                        );
                    }
                }
            });
    }

    /**
     * Fetches claims for a credential configuration from webhook if configured.
     * This should be called once before batch processing to avoid redundant webhook calls.
     * @param credentialConfigurationId
     * @param session
     * @returns The fetched claims or undefined if no webhook is configured
     */
    getClaimsFromWebhook(
        credentialConfigurationId: string,
        session: Session,
    ): Promise<Record<string, any> | undefined> {
        const claimsSource =
            session.credentialPayload?.credentialClaims?.[
                credentialConfigurationId
            ];

        if (claimsSource?.type === "webhook") {
            const logContext: SessionLogContext = {
                sessionId: session.id,
                tenantId: session.tenantId,
                flowType: "OID4VCI",
                stage: "fetching-claims-webhook",
            };
            return this.webhookService
                .sendWebhook({
                    webhook: claimsSource.webhook,
                    logContext,
                    session,
                    expectResponse: true,
                })
                .then((response) => response[credentialConfigurationId]);
        }

        return Promise.resolve(undefined);
    }

    /**
     * Issues a credential based on the provided configuration and session.
     * Delegates to format-specific issuer services.
     * @param credentialConfigurationId
     * @param holderCnf
     * @param session
     * @param preloadedClaims Optional claims fetched from webhook (to avoid redundant calls in batch)
     * @returns
     */
    async getCredential(
        credentialConfigurationId: string,
        holderCnf: Jwk,
        session: Session,
        preloadedClaims?: Record<string, any>,
    ) {
        const credentialConfiguration =
            await this.credentialConfigRepo.findOneByOrFail({
                tenantId: session.tenantId,
                id: credentialConfigurationId,
            });

        if (!credentialConfiguration)
            throw new ConflictException(
                `Credential configuration with id ${credentialConfigurationId} not found`,
            );

        /**
         * Priority of the claims
         * 1. fetched via passed webhook (preloadedClaims)
         * 2. inline claims stored in the session
         * 3. webhook from the credential configuration
         * 4. static claims from the credential configuration
         */
        // Extract claims from the session's credentialClaims (discriminated union)
        let usedClaims = credentialConfiguration.claims ?? {}; // default fallback

        // Use preloaded claims if provided (from webhook or inline)
        if (preloadedClaims) {
            usedClaims = preloadedClaims;
        } else {
            // Fallback: check if inline claims are in the session
            const claimsSource =
                session.credentialPayload?.credentialClaims?.[
                    credentialConfigurationId
                ];
            if (claimsSource?.type === "inline") {
                usedClaims = claimsSource.claims;
            } else if (credentialConfiguration.claimsWebhook) {
                const logContext: SessionLogContext = {
                    sessionId: session.id,
                    tenantId: session.tenantId,
                    flowType: "OID4VCI",
                    stage: "fetching-claims-webhook",
                };
                usedClaims = await this.webhookService
                    .sendWebhook({
                        webhook: credentialConfiguration.claimsWebhook,
                        logContext,
                        session,
                        expectResponse: true,
                    })
                    .then(
                        (response) => response?.data[credentialConfigurationId],
                    );
            }
        }

        // Delegate to format-specific issuer service
        const format = credentialConfiguration.config.format;

        if (format === "mso_mdoc") {
            // For mDOC, holderCnf is the device key
            return this.mdocIssuerService.issue({
                credentialConfiguration,
                deviceKey: holderCnf,
                session,
                claims: usedClaims,
            });
        } else {
            // Default to SD-JWT VC (handles "dc+sd-jwt" and "vc+sd-jwt" formats)
            return this.sdjwtvcIssuerService.issue({
                credentialConfiguration,
                holderCnf,
                session,
                claims: usedClaims,
            });
        }
    }

    /**
     * Retrieves the VCT (Verifiable Credential Type) for a specific credential configuration.
     * @param credentialId
     * @param tenantId
     * @returns
     */
    async getVCT(credentialId: string, tenantId: string): Promise<VCT> {
        const credentialConfig = await this.credentialConfigRepo
            .findOneByOrFail({
                id: credentialId,
                tenantId,
            })
            .catch(() => {
                throw new ConflictException(
                    `Credential configuration with id ${credentialId} not found`,
                );
            });
        if (!credentialConfig.vct) {
            throw new ConflictException(
                `VCT for credential configuration with id ${credentialId} not found`,
            );
        }
        // If vct is a string URI, this endpoint doesn't apply
        if (typeof credentialConfig.vct === "string") {
            throw new ConflictException(
                `VCT for credential configuration with id ${credentialId} is a URI, not hosted by this server`,
            );
        }
        const host = this.configService.getOrThrow<string>("PUBLIC_URL");
        credentialConfig.vct.vct = `${host}/${tenantId}/credentials-metadata/vct/${credentialConfig.id}`;
        return credentialConfig.vct;
    }
}
