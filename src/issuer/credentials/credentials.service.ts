import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Jwk } from '@openid4vc/oauth2';
import { digest, generateSalt } from '@sd-jwt/crypto-nodejs';
import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import { CryptoService } from '../../crypto/crypto.service';
import { StatusListService } from '../status-list/status-list.service';
import { CredentialConfigurationSupported } from '@openid4vc/openid4vci';
import { Session } from '../../session/entities/session.entity';
import { SchemaResponse } from './dto/schema-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IssuanceConfig } from './entities/issuance-config.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CredentialsService {
    constructor(
        private crpytoService: CryptoService,
        private configService: ConfigService,
        private statusListService: StatusListService,
        @InjectRepository(IssuanceConfig)
        private issuanceConfigRepo: Repository<IssuanceConfig>,
    ) {}

    /**
     *
     * @param tenantId
     * @returns
     */
    public getConfig(tenantId: string): Promise<IssuanceConfig[]> {
        return this.issuanceConfigRepo.findBy({ tenantId });
    }

    async getConfigById(
        credentialId: string,
        tenantId: string,
    ): Promise<IssuanceConfig> {
        return this.issuanceConfigRepo.findOneByOrFail({
            id: credentialId,
            tenantId,
        });
    }

    /**
     * Store the config. If it already exist, overwrite it.
     * @param tenantId
     * @param value
     * @returns
     */
    async storeCredentialConfiguration(
        tenantId: string,
        value: IssuanceConfig,
    ) {
        value.tenantId = tenantId;
        return this.issuanceConfigRepo.save(value);
    }

    /**
     * Deletes a credential configuration.
     * @param tenantId
     * @param id
     * @returns
     */
    deleteCredentialConfiguration(tenantId: string, id: string) {
        return this.issuanceConfigRepo.delete({ tenantId, id });
    }

    /**
     * Returns the credential configuration that is required for oid4vci
     * @param tenantId
     * @returns
     */
    async getCredentialConfiguration(
        tenantId: string,
    ): Promise<Record<string, CredentialConfigurationSupported>> {
        const credential_configurations_supported: Record<
            string,
            CredentialConfigurationSupported
        > = {};
        (await this.getConfig(tenantId)).forEach((credential) => {
            credential_configurations_supported[credential.id] =
                credential.config;
        });
        return credential_configurations_supported;
    }

    async getCredential(
        credentialConfigurationId: string,
        cnf: Jwk,
        session: Session,
    ) {
        const vc = await this.getConfigById(
            credentialConfigurationId,
            session.tenantId,
        );
        const claims =
            session.credentialPayload?.values?.[credentialConfigurationId] ??
            vc.claims;
        const disclosureFrame = vc.disclosureFrame;

        const sdjwt = new SDJwtVcInstance({
            signer: await this.crpytoService.keyService.signer(
                session.tenantId,
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
                vct: `${this.configService.getOrThrow<string>('PUBLIC_URL')}/${session.tenantId}/credentials/vct/${vc.id}`,
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
                    x5c: this.crpytoService.getCertChain(
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
    async getVCT(credentialId: string, tenantId: string) {
        const vc = await this.issuanceConfigRepo.findOneByOrFail({
            id: credentialId,
            tenantId,
        });
        if (!vc.vct) {
            throw new ConflictException(
                `VCT for credential configuration with id ${credentialId} not found`,
            );
        }
        const host = this.configService.getOrThrow<string>('PUBLIC_URL');
        vc.vct.vct = `${host}/${tenantId}/credentials/vct/${vc.id}`;
        return vc.vct;
    }

    /**
     * Retrieves the schema for a specific credential configuration.
     * @param id
     * @param tenantId
     * @returns
     */
    async getSchema(id: string, tenantId: string): Promise<SchemaResponse> {
        const vc = await this.issuanceConfigRepo.findOneByOrFail({
            id,
            tenantId,
        });
        if (!vc.schema) {
            throw new ConflictException(
                `Schema for credential configuration with id ${id} not found`,
            );
        }
        return vc.schema;
    }
}
