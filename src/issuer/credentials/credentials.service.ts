import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Jwk } from '@openid4vc/oauth2';
import { digest, generateSalt } from '@sd-jwt/crypto-nodejs';
import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import { CryptoService } from '../../crypto/crypto.service';
import { StatusListService } from '../status-list/status-list.service';
import { CredentialConfigurationSupported } from '@openid4vc/openid4vci';
import { Session } from '../../session/entities/session.entity';
import { SchemaResponse } from '../credentials-metadata/dto/schema-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CredentialConfig } from './entities/credential.entity';
import { VCT } from '../credentials-metadata/dto/credential-config.dto';
import { IssuanceService } from '../issuance/issuance.service';
import { IssuanceConfig } from '../issuance/entities/issuance-config.entity';
import { CryptoImplementationService } from '../../crypto/key/crypto-implementation/crypto-implementation.service';
import { JWTwithStatusListPayload } from '@sd-jwt/jwt-status-list';

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
     * @param issuanceConfigService
     * @param cryptoImplementationService
     */
    constructor(
        private cryptoService: CryptoService,
        private configService: ConfigService,
        private statusListService: StatusListService,
        @InjectRepository(CredentialConfig)
        private credentialConfigRepo: Repository<CredentialConfig>,
        private issuanceConfigService: IssuanceService,
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
            cryptographic_binding_methods_supported: ['jwk'],
        };

        for (const value of configs) {
            const isUsed = issuanceConfig.credentialIssuanceBindings.find(
                (binding) => binding.credentialConfigId === value.id,
            );
            value.config.vct = `${this.configService.getOrThrow<string>('PUBLIC_URL')}/${session.tenantId}/credentials/vct/${value.id}`;

            if (isUsed?.credentialConfig)
                value.config = {
                    ...value.config,
                    ...kb,
                };
            credential_configurations_supported[value.id] = value.config;
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
    ) {
        const credentialConfiguration = await this.credentialConfigRepo
            .findOneByOrFail({
                id: credentialConfigurationId,
                tenantId: session.tenantId,
            })
            .catch(() => {
                throw new ConflictException(
                    `Credential configuration with id ${credentialConfigurationId} not found`,
                );
            });

        const claims =
            session.credentialPayload?.values?.[credentialConfigurationId] ??
            credentialConfiguration.claims;
        const disclosureFrame = credentialConfiguration.disclosureFrame;

        const issuanceConfig =
            await this.issuanceConfigService.getIssuanceConfigurationById(
                session.issuanceId!,
                session.tenantId,
            );
        const binding = issuanceConfig.credentialIssuanceBindings.find(
            (binding) =>
                binding.credentialConfigId === credentialConfigurationId,
        );

        const keyId =
            binding?.credentialConfig?.keyId ??
            (await this.cryptoService.keyService.getKid(
                session.tenantId,
                'signing',
            ));

        const sdjwt = new SDJwtVcInstance({
            signer: await this.cryptoService.keyService.signer(
                session.tenantId,
                keyId,
            ),
            signAlg: this.cryptoImplementationService.getAlg(),
            hasher: digest,
            hashAlg: 'sha-256',
            saltGenerator: generateSalt,
            loadTypeMetadataFormat: true,
        });

        const credentialConfig =
            await this.credentialConfigRepo.findOneByOrFail({
                id: credentialConfigurationId,
                tenantId: session.tenantId,
            });

        // If status management is enabled, create a status entry
        let status: JWTwithStatusListPayload | undefined;
        if (credentialConfig.statusManagement) {
            status = await this.statusListService.createEntry(
                session,
                credentialConfigurationId,
            );
        }

        const iat = Math.round(new Date().getTime() / 1000);
        // Set expiration time if lifeTime is defined
        let exp: number | undefined;
        if (credentialConfig.lifeTime) {
            exp = iat + credentialConfig.lifeTime;
        }

        // If key binding is enabled, include the JWK in the cnf
        let cnf: { jwk: Jwk } | undefined;

        if (credentialConfig.keyBinding) {
            cnf = {
                jwk: holderCnf,
            };
        }

        return sdjwt.issue(
            {
                iss: this.configService.getOrThrow<string>('PUBLIC_URL'),
                iat,
                exp,
                vct: `${this.configService.getOrThrow<string>('PUBLIC_URL')}/${session.tenantId}/credentials/vct/${credentialConfigurationId}`,
                cnf,
                ...claims,
                ...status,
            },
            disclosureFrame,
            {
                header: {
                    x5c: await this.cryptoService.getCertChain(
                        'signing',
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
        const host = this.configService.getOrThrow<string>('PUBLIC_URL');
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
