import { ConflictException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import type { Jwk } from "@openid4vc/oauth2";
import { CredentialConfigurationSupported } from "@openid4vc/openid4vci";
import { digest, generateSalt } from "@sd-jwt/crypto-nodejs";
import { JWTwithStatusListPayload } from "@sd-jwt/jwt-status-list";
import { SDJwtVcInstance } from "@sd-jwt/sd-jwt-vc";
import { Repository } from "typeorm";
import { CryptoService } from "../../crypto/crypto.service";
import { CryptoImplementationService } from "../../crypto/key/crypto-implementation/crypto-implementation.service";
import { Session } from "../../session/entities/session.entity";
import { SchemaResponse } from "../credentials-metadata/dto/schema-response.dto";
import { VCT } from "../credentials-metadata/dto/vct.dto";
import { IssuanceConfig } from "../issuance/entities/issuance-config.entity";
import { StatusListService } from "../status-list/status-list.service";
import { CredentialConfig } from "./entities/credential.entity";

/**
 * Service for managing credentials and their configurations.
 */
@Injectable()
export class CredentialsService {
    /**
     * Constructor for CredentialsService.
     * @param cryptoService
     * @param configService
     * @param statusListService
     * @param credentialConfigRepo
     * @param cryptoImplementationService
     */
    constructor(
        private cryptoService: CryptoService,
        private configService: ConfigService,
        private statusListService: StatusListService,
        @InjectRepository(CredentialConfig)
        private credentialConfigRepo: Repository<CredentialConfig>,
        private cryptoImplementationService: CryptoImplementationService,
    ) {}

    /**
     * Returns the credential configuration that is required for oid4vci
     * @param tenantId
     * @returns
     */
    async getCredentialConfigurationSupported(
        session: Session,
        issuanceConfig: IssuanceConfig,
    ): Promise<Record<string, CredentialConfigurationSupported>> {
        const credential_configurations_supported: Record<
            string,
            CredentialConfigurationSupported
        > = {};

        const configs = await this.credentialConfigRepo.findBy({
            tenantId: session.tenantId,
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
            const isUsed = issuanceConfig.credentialConfigs.find(
                (config) => config.id === value.id,
            );
            (value.config as CredentialConfigurationSupported).vct =
                `${this.configService.getOrThrow<string>("PUBLIC_URL")}/${session.tenantId}/credentials-metadata/vct/${value.id}`;

            if (value.embeddedDisclosurePolicy) {
                delete (value.embeddedDisclosurePolicy as any).$schema;
                (
                    value.config as CredentialConfigurationSupported
                ).disclosure_policy = value.embeddedDisclosurePolicy;
            }

            if (isUsed?.id)
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
     * Issues a credential based on the provided configuration and session.
     * @param credentialConfigurationId
     * @param holderCnf
     * @param session
     * @returns
     */
    async getCredential(
        credentialConfigurationId: string,
        holderCnf: Jwk,
        session: Session,
        issuanceConfig: IssuanceConfig,
        claims?: Record<string, Record<string, unknown>>,
    ) {
        const credentialConfiguration = issuanceConfig.credentialConfigs.find(
            (config) => config.id === credentialConfigurationId,
        );
        if (!credentialConfiguration)
            throw new ConflictException(
                `Credential configuration with id ${credentialConfigurationId} not found`,
            );
        //use passed claims, if not provided try the ones stored in the session and the use default ones from the config is provided
        const usedClaims =
            claims?.[credentialConfigurationId] ??
            session.credentialPayload?.claims?.[credentialConfigurationId] ??
            credentialConfiguration.claims;
        const disclosureFrame = credentialConfiguration.disclosureFrame;

        const keyId =
            credentialConfiguration?.keyId ??
            (await this.cryptoService.keyService.getKid(
                session.tenantId,
                "signing",
            ));

        //at this point it is sd-jwt specific.

        const sdjwt = new SDJwtVcInstance({
            signer: await this.cryptoService.keyService.signer(
                session.tenantId,
                keyId,
            ),
            signAlg: this.cryptoImplementationService.getAlg(),
            hasher: digest,
            hashAlg: "sha-256",
            saltGenerator: generateSalt,
            loadTypeMetadataFormat: true,
        });

        // If status management is enabled, create a status entry
        let status: JWTwithStatusListPayload | undefined;
        if (credentialConfiguration.statusManagement) {
            status = await this.statusListService.createEntry(
                session,
                credentialConfigurationId,
            );
        }

        const iat = Math.round(new Date().getTime() / 1000);
        // Set expiration time if lifeTime is defined
        let exp: number | undefined;
        if (credentialConfiguration.lifeTime) {
            exp = iat + credentialConfiguration.lifeTime;
        }

        // If key binding is enabled, include the JWK in the cnf
        let cnf: { jwk: Jwk } | undefined;

        if (credentialConfiguration.keyBinding) {
            cnf = {
                jwk: holderCnf,
            };
        }

        return sdjwt.issue(
            {
                iss: this.configService.getOrThrow<string>("PUBLIC_URL"),
                iat,
                exp,
                vct: `${this.configService.getOrThrow<string>("PUBLIC_URL")}/${session.tenantId}/credentials-metadata/vct/${credentialConfigurationId}`,
                cnf,
                ...usedClaims,
                ...status,
            },
            disclosureFrame,
            {
                header: {
                    x5c: await this.cryptoService.getCertChain(
                        "signing",
                        session.tenantId,
                    ),
                    alg: this.cryptoImplementationService.getAlg(),
                },
            },
        );
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
        const host = this.configService.getOrThrow<string>("PUBLIC_URL");
        credentialConfig.vct.vct = `${host}/${tenantId}/credentials-metadata/vct/${credentialConfig.id}`;
        return credentialConfig.vct;
    }

    /**
     * Retrieves the schema for a specific credential configuration.
     * @param id
     * @param tenantId
     * @returns
     */
    async getSchema(
        credentialConfigurationId: string,
        tenantId: string,
    ): Promise<SchemaResponse> {
        const credentialConfig =
            await this.credentialConfigRepo.findOneByOrFail({
                tenantId,
            });
        if (!credentialConfig) {
            throw new ConflictException(
                `Credential configuration with id ${credentialConfigurationId} not found`,
            );
        }
        if (!credentialConfig.schema) {
            throw new ConflictException(
                `Schema for credential configuration with id ${credentialConfigurationId} not found`,
            );
        }
        return credentialConfig.schema;
    }
}
