import {
    Injectable,
    OnApplicationBootstrap,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from '@badgateway/oauth2-client';
import { client } from './generated/client.gen';
import {
    accessCertificateControllerFindOne,
    accessCertificateControllerRegister,
    registrationCertificateControllerAll,
    registrationCertificateControllerRegister,
    relyingPartyControllerFindAll,
    relyingPartyControllerRegister,
} from './generated';
import { CryptoService } from '../crypto/crypto.service';
import { RegistrationCertificateRequest } from '../verifier/presentations/dto/vp-request.dto';
import { PresentationsService } from '../verifier/presentations/presentations.service';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { RegistrarConfig } from './registrar-config';
import { join } from 'node:path';
import { OnEvent } from '@nestjs/event-emitter';
import { TENANT_EVENTS } from '../auth/tenant-events';

/**
 * Repsonse of access certificate request.
 */
interface AccessCertificateResponse {
    /**
     * Unique identifier of the access certificate.
     */
    id: string;
    /**
     * The public key in PEM format.
     */
    crt: string;
    /**
     * Indicates if the access certificate is revoked.
     */
    revoked?: boolean;
}

/**
 * RegistrarService is responsible for managing the interaction with the registrar,
 * including adding relying parties, access certificates, and registration certificates.
 */
@Injectable()
export class RegistrarService implements OnApplicationBootstrap, OnModuleInit {
    /**
     * OAuth2 client for interacting with the OIDC provider.
     */
    private oauth2Client: OAuth2Client;
    /**
     * Client for interacting with the registrar API.
     */
    private client: typeof client;
    /**
     * Access token for authenticating requests to the registrar.
     */
    private accessToken: string;

    /**
     * Constructor for the RegistrarService.
     * @param configService - Instance of ConfigService for accessing configuration values.
     * @param cryptoService - Instance of CryptoService for cryptographic operations.
     * @param presentationsService - Instance of PresentationsService for handling presentations.
     */
    constructor(
        private configService: ConfigService,
        private cryptoService: CryptoService,
        private presentationsService: PresentationsService,
    ) {}

    /**
     * Initializes the OAuth2 client and registrar client with the necessary configurations.
     */
    onModuleInit() {
        //when not set, we will not use the registrar
        if (!this.isEnabled()) {
            return;
        }

        const oidcIssuerUrl =
            this.configService.getOrThrow<string>('REGISTRAR_OIDC_URL');
        const clientId = this.configService.getOrThrow<string>(
            'REGISTRAR_OIDC_CLIENT_ID',
        );
        const clientSecret = this.configService.getOrThrow<string>(
            'REGISTRAR_OIDC_CLIENT_SECRET',
        );

        this.oauth2Client = new OAuth2Client({
            server: `${oidcIssuerUrl}/protocol/openid-connect/token`,
            clientId,
            clientSecret,
            discoveryEndpoint: `${oidcIssuerUrl}/.well-known/openid-configuration`,
        });

        this.client = client;
        this.client.setConfig({
            baseUrl: this.configService.getOrThrow<string>('REGISTRAR_URL'),
            auth: () => this.accessToken,
        });
    }

    /**
     * Checks if the registrar service is enabled based on the configuration.
     * @returns True if the registrar service is enabled, false otherwise.
     */
    isEnabled() {
        return !!this.configService.get<string>('REGISTRAR_URL');
    }

    /**
     * This function is called when the application starts.
     * It will refresh the access token for the registrar.
     */
    async onApplicationBootstrap() {
        if (!this.configService.get<string>('REGISTRAR_URL')) {
            return;
        }
        await this.refreshAccessToken();
    }

    /**
     * This function is called when a tenant is initialized.
     * @param tenantId
     */
    @OnEvent(TENANT_EVENTS.TENANT_KEYS, { async: true })
    async onTenantInit(tenantId: string) {
        if (!this.isEnabled()) {
            return;
        }
        const config = this.loadConfig(tenantId);
        if (!config.id) {
            config.id = await this.addRp(tenantId);
        }
        await this.getAccessCertificateId(config, tenantId);
    }

    /**
     * Refreshes the access token for the registrar using client credentials.
     * This method is called periodically to ensure the access token is valid.
     */
    async refreshAccessToken() {
        await this.oauth2Client.clientCredentials().then((token) => {
            this.accessToken = token.accessToken;
            const date = new Date();
            const expirationDate = new Date(token.expiresAt as number);
            setTimeout(
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                () => this.refreshAccessToken(),
                expirationDate.getTime() - date.getTime() - 1000,
            );
        });
    }

    /**
     * Adds a new relying party to the registrar.
     * This is only needed once, when the relying party is created.
     */
    addRp(tenantId: string): Promise<string> {
        const name = this.configService.getOrThrow<string>('RP_NAME');
        return relyingPartyControllerRegister({
            client: this.client,
            body: {
                name,
            },
        }).then(async (response) => {
            const config = this.loadConfig(tenantId);
            if (response.error) {
                config.id = await this.storeExistingRp(name);
                this.saveConfig(config, tenantId);
                return config.id!;
            } else {
                config.id = response.data!['id'];
                this.saveConfig(config, tenantId);
                return response.data!['id'];
            }
        });
    }

    /**
     * Stores the existing relying party ID based on the name.
     * This is used when the relying party already exists in the registrar.
     * @param name - The name of the relying party.
     * @returns The ID of the existing relying party.
     */
    private storeExistingRp(name: string) {
        return relyingPartyControllerFindAll({
            client: this.client,
            query: {
                name,
            },
        }).then((response) => {
            return response.data!.find((item) => item.name === name)?.id;
        });
    }

    /**
     * Get the access certificate ID from the registrar.
     * If there is no access certificate ID in the config, it will add a new one.
     * If there is one, it will check if it is still valid.
     * If it is revoked, it will add a new one.
     * @param config
     */
    async getAccessCertificateId(config: RegistrarConfig, tenantId: string) {
        // if there is no access certificate ID in the config, we need to add it
        if (!config.accessCertificateId) {
            await this.addAccessCertificate(config, tenantId);
        }
        // if there is one, check if it is still valid
        await accessCertificateControllerFindOne({
            client: this.client,
            path: { rp: config.id, id: config.accessCertificateId! },
        }).then((res) => {
            if (res.error) {
                console.error('Error finding access certificate:', res.error);
            }
            const data = res.data as AccessCertificateResponse;
            if (data.revoked) {
                console.warn('Access certificate is revoked, adding a new one');
                return this.addAccessCertificate(config, tenantId);
            }
        });
    }

    /**
     * Add a new access certificate to the registrar.
     * This is only needed once, when the access certificate is created.
     * If the access certificate already exists, it will be returned.
     * @returns
     */
    private async addAccessCertificate(
        config: RegistrarConfig,
        tenantId: string,
    ): Promise<string> {
        const host = this.configService
            .getOrThrow<string>('PUBLIC_URL')
            .replace('https://', '');
        return accessCertificateControllerRegister({
            client: this.client,
            body: {
                publicKey: await this.cryptoService.keyService.getPublicKey(
                    'pem',
                    tenantId,
                ),
                dns: [host],
            },
            path: {
                rp: config.id,
            },
        }).then((res) => {
            if (res.error) {
                console.error('Error adding access certificate:', res.error);
                throw new Error('Error adding access certificate');
            }
            //store the cert
            this.cryptoService.storeAccessCertificate(
                res.data!['crt'],
                tenantId,
            );
            config.accessCertificateId = res.data!['id'];
            this.saveConfig(config, tenantId);
            return res.data!['id'];
        });
    }

    /**
     * Add a new registration certificate to the registrar.
     * This is only needed once, when the registration certificate is created.
     * If the registration certificate already exists, it will be returned.
     * @returns
     */
    async addRegistrationCertificate(
        req: RegistrationCertificateRequest,
        //TODO: check if the dcql_query is covered by the registration certificate. If not, we need to throw an error since we do not know the new purpose for it.
        dcql_query: any,
        requestId: string,
        tenantId: string,
    ) {
        const rp = this.loadConfig(tenantId).id;

        //TODO: need to check if the access certificate is bound to the access certificate with the subject. Also that the requested fields are matching.

        const certs =
            (await registrationCertificateControllerAll({
                client: this.client,
                path: {
                    rp,
                },
            }).then((res) =>
                res.data?.filter(
                    (cert) =>
                        cert.revoked == null && cert.id === (req.id as string),
                ),
            )) || [];

        if (certs?.length > 0) {
            return certs[0].jwt;
        }

        return registrationCertificateControllerRegister({
            client: this.client,
            path: {
                rp,
            },
            body: req.body,
        }).then(async (res) => {
            if (res.error) {
                console.error(
                    'Error adding registration certificate:',
                    res.error,
                );
                throw new Error('Error adding registration certificate');
            }

            //TODO: write the ID to the config so its easier to use it. Easier than writing the comparison algorithm (any maybe someone wants to use a different one)
            await this.presentationsService.storeRCID(
                res.data!['id'],
                requestId,
                tenantId,
            );
            return res.data!['jwt'];
        });
    }

    /**
     * Load the registrar configuration from the config file.
     * @returns
     */
    private loadConfig(tenantId: string): RegistrarConfig {
        const filePath = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            'registrar.json',
        );

        if (!existsSync(filePath)) {
            // If the config file does not exist, create an empty config
            const initialConfig: RegistrarConfig = {};
            writeFileSync(filePath, JSON.stringify(initialConfig, null, 2));
            return initialConfig;
        }
        const config = JSON.parse(
            readFileSync(filePath, 'utf-8'),
        ) as RegistrarConfig;
        return config;
    }

    /**
     * Save the registrar configuration to the config file.
     * @param config
     */
    private saveConfig(config: RegistrarConfig, tenantId: string) {
        const filePath = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            'registrar.json',
        );
        writeFileSync(filePath, JSON.stringify(config, null, 2));
    }
}
