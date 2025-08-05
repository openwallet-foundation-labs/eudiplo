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

@Injectable()
export class CredentialsService {
    constructor(
        private cryptoService: CryptoService,
        private configService: ConfigService,
        private statusListService: StatusListService,
        @InjectRepository(CredentialConfig)
        private credentialConfigRepo: Repository<CredentialConfig>,
        private issuanceConfigService: IssuanceService,
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

        const configs = await this.credentialConfigRepo.findBy({ tenantId });

        for (const value of configs) {
            credential_configurations_supported[value.id] = value.config;
        }
        return credential_configurations_supported;
    }

    async getCredential(
        credentialConfigurationId: string,
        cnf: Jwk,
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

        const sdjwt = new SDJwtVcInstance({
            signer: await this.cryptoService.keyService.signer(
                session.tenantId,
                binding?.keyID,
            ),
            signAlg: 'ES256',
            hasher: digest,
            hashAlg: 'sha-256',
            saltGenerator: generateSalt,
            loadTypeMetadataFormat: true,
        });

        return sdjwt.issue(
            {
                iss: this.configService.getOrThrow<string>('PUBLIC_URL'),
                iat: Math.round(new Date().getTime() / 1000),
                vct: `${this.configService.getOrThrow<string>('PUBLIC_URL')}/${session.tenantId}/credentials/vct/${credentialConfigurationId}`,
                cnf: {
                    jwk: cnf,
                },
                ...(await this.statusListService.createEntry(
                    session,
                    credentialConfigurationId,
                )),
                ...claims,
            },
            disclosureFrame,
            {
                header: {
                    x5c: await this.cryptoService.getCertChain(
                        'signing',
                        session.tenantId,
                    ),
                    alg: 'ES256',
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
