import {
    ConflictException,
    Injectable,
    type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Jwk } from '@openid4vc/oauth2';
import { digest, generateSalt } from '@sd-jwt/crypto-nodejs';
import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import { CryptoService } from '../../crypto/crypto.service';
import { StatusListService } from '../status-list/status-list.service';
import {
    existsSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'fs';
import { join, posix } from 'path';
import { CredentialConfigurationSupported } from '@openid4vc/openid4vci';
import { CredentialConfig } from './dto/credential-config.dto';
import { Session } from '../../session/entities/session.entity';
import { SchemaResponse } from './dto/schema-response.dto';

@Injectable()
export class CredentialsService implements OnModuleInit {
    private sdjwt: SDJwtVcInstance;
    private folder: string;

    constructor(
        private crpytoService: CryptoService,
        private configService: ConfigService,
        private statusListService: StatusListService,
    ) {}

    onModuleInit() {
        this.folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            'issuance',
        );

        this.sdjwt = new SDJwtVcInstance({
            signer: this.crpytoService.keyService.signer,
            signAlg: 'ES256',
            hasher: digest,
            hashAlg: 'sha-256',
            saltGenerator: generateSalt,
            loadTypeMetadataFormat: true,
        });
    }

    public getConfig(): CredentialConfig[] {
        const files = readdirSync(this.folder);
        return files.map((file) => {
            const config = JSON.parse(
                readFileSync(join(this.folder, file), 'utf-8').replace(
                    /<PUBLIC_URL>/g,
                    this.configService.getOrThrow<string>('PUBLIC_URL'),
                ),
            ) as CredentialConfig;
            config.id = file.replace('.json', '');
            return config;
        });
    }

    getConfigById(credentialId: string): CredentialConfig {
        const config = this.getConfig().find(
            (credential) => credential.id === credentialId,
        );
        if (!config) {
            throw new ConflictException(
                `Credential configuration with id ${credentialId} not found`,
            );
        }
        return config;
    }

    storeCredentialConfiguration(value: CredentialConfig) {
        const safeId = posix
            .normalize(value.id)
            .replace(/^(\.\.(\/|\\|$))+/, '');
        const filePath = join(this.folder, `${safeId}.json`);
        writeFileSync(filePath, JSON.stringify(value, null, 2));
    }

    deleteCredentialConfiguration(id: string) {
        const safeId = posix.normalize(id).replace(/^(\.\.(\/|\\|$))+/, '');
        const filePath = join(this.folder, `${safeId}.json`);
        if (!existsSync(filePath)) {
            throw new ConflictException(
                `Credential configuration with id ${id} not found`,
            );
        }
        rmSync(filePath, { force: true });
    }

    getCredentialConfiguration(): Record<
        string,
        CredentialConfigurationSupported
    > {
        const credential_configurations_supported: Record<
            string,
            CredentialConfigurationSupported
        > = {};
        this.getConfig().forEach((credential) => {
            credential_configurations_supported[credential.id] =
                credential.config;
        });
        return credential_configurations_supported;
    }

    getCredential(
        credentialConfigurationId: string,
        cnf: Jwk,
        session: Session,
    ) {
        const vc = this.getConfigById(credentialConfigurationId);
        const claims =
            session.credentialPayload?.values?.[credentialConfigurationId] ??
            vc.claims;
        const disclosureFrame = vc.disclosureFrame;

        return this.sdjwt.issue(
            {
                iss: this.configService.getOrThrow<string>('PUBLIC_URL'),
                iat: Math.round(new Date().getTime() / 1000),
                vct: `${this.configService.getOrThrow<string>('PUBLIC_URL')}/credentials/vct/${vc.id}`,
                cnf: {
                    jwk: cnf,
                },
                ...this.statusListService.createEntry(session.id),
                ...claims,
            },
            disclosureFrame,
            {
                header: {
                    x5c: this.crpytoService.getCertChain('signing'),
                    alg: 'ES256',
                },
            },
        );
    }

    getVCT(credentialId: string) {
        const vc = this.getConfigById(credentialId);
        if (!vc.vct) {
            throw new ConflictException(
                `VCT for credential configuration with id ${credentialId} not found`,
            );
        }
        const host = this.configService.getOrThrow<string>('PUBLIC_URL');
        vc.vct.vct = `${host}/credentials/vct/${vc.id}`;
        return vc.vct;
    }

    getSchema(id: string): SchemaResponse {
        const vc = this.getConfigById(id);
        if (!vc.schema) {
            throw new ConflictException(
                `Schema for credential configuration with id ${id} not found`,
            );
        }
        return vc.schema;
    }
}
