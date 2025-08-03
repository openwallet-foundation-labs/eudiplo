import {
    ConflictException,
    Injectable,
    OnApplicationBootstrap,
} from '@nestjs/common';
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
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { PinoLogger } from 'nestjs-pino';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class CredentialsService implements OnApplicationBootstrap {
    constructor(
        private crpytoService: CryptoService,
        private configService: ConfigService,
        private statusListService: StatusListService,
        private logger: PinoLogger,
        @InjectRepository(CredentialConfig)
        private credentialConfigRepo: Repository<CredentialConfig>,
    ) {}

    /**
     * Imports credential configurations from a predefined directory structure.
     */
    async onApplicationBootstrap() {
        const configPath = 'assets/config';
        const subfolder = 'issuance/credentials';
        const force = this.configService.get<boolean>('CONFIG_IMPORT_FORCE');
        if (this.configService.get<boolean>('CONFIG_IMPORT')) {
            const tenantFolders = readdirSync(configPath, {
                withFileTypes: true,
            }).filter((tenant) => tenant.isDirectory());
            let counter = 0;
            for (const tenant of tenantFolders) {
                //iterate over all elements in the folder and import them
                const path = join(configPath, tenant.name, subfolder);
                const files = readdirSync(path);
                for (const file of files) {
                    const payload = JSON.parse(
                        readFileSync(join(path, file), 'utf8'),
                    );

                    payload.id = file.replace('.json', '');
                    if (
                        (await this.getCredentialConfiguration(
                            payload.id,
                            tenant.name,
                        )) &&
                        !force
                    ) {
                        continue; // Skip if config already exists and force is not set
                    }

                    // Validate the payload against CredentialConfig
                    const config = plainToClass(CredentialConfig, payload);
                    const validationErrors = await validate(config);

                    if (validationErrors.length > 0) {
                        this.logger.error(
                            {
                                event: 'ValidationError',
                                file,
                                tenant: tenant.name,
                                errors: validationErrors.map((error) => ({
                                    property: error.property,
                                    constraints: error.constraints,
                                    value: error.value,
                                })),
                            },
                            `Validation failed for issuance config ${file} in tenant ${tenant.name}`,
                        );
                        continue; // Skip this invalid config
                    }

                    await this.storeCredentialConfiguration(
                        tenant.name,
                        config,
                    );
                    counter++;
                }
                this.logger.info(
                    {
                        event: 'Import',
                    },
                    `${counter} credential configs imported for ${tenant.name}`,
                );
            }
        }
    }

    /**
     * Store the config. If it already exist, overwrite it.
     * @param tenantId
     * @param value
     * @returns
     */
    async storeCredentialConfiguration(
        tenantId: string,
        value: CredentialConfig,
    ) {
        value.tenantId = tenantId;
        return this.credentialConfigRepo.save(value);
    }

    /**
     * Returns the credential configuration for a given id and tenant
     * @param credentialConfigurationId
     * @param tenantId
     * @returns
     */
    async getCredentialConfiguration(
        credentialConfigurationId: string,
        tenantId: string,
    ): Promise<CredentialConfig | null> {
        return this.credentialConfigRepo
            .findOneBy({
                id: credentialConfigurationId,
                tenantId,
            })
            .catch(() => {
                throw new ConflictException(
                    `Credential configuration with id ${credentialConfigurationId} not found`,
                );
            });
    }

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
