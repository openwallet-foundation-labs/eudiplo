import { OAuth2Client } from "@badgateway/oauth2-client";
import {
    Injectable,
    OnApplicationBootstrap,
    OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TenantEntity } from "../auth/entitites/tenant.entity";
import { CryptoService } from "../crypto/crypto.service";
import { RegistrationCertificateRequest } from "../verifier/presentations/dto/vp-request.dto";
import { PresentationsService } from "../verifier/presentations/presentations.service";
import { RegistrarEntity } from "./entities/registrar.entity";
import {
    accessCertificateControllerRegister,
    registrationCertificateControllerAll,
    registrationCertificateControllerRegister,
    relyingPartyControllerFindAll,
    relyingPartyControllerRegister,
} from "./generated";
import { client } from "./generated/client.gen";

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
        @InjectRepository(RegistrarEntity)
        private registrarRepository: Repository<RegistrarEntity>,
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
            this.configService.getOrThrow<string>("REGISTRAR_OIDC_URL");
        const clientId = this.configService.getOrThrow<string>(
            "REGISTRAR_OIDC_CLIENT_ID",
        );
        const clientSecret = this.configService.getOrThrow<string>(
            "REGISTRAR_OIDC_CLIENT_SECRET",
        );

        this.oauth2Client = new OAuth2Client({
            server: `${oidcIssuerUrl}/protocol/openid-connect/token`,
            clientId,
            clientSecret,
            discoveryEndpoint: `${oidcIssuerUrl}/.well-known/openid-configuration`,
        });

        this.client = client;
        this.client.setConfig({
            baseUrl: this.configService.getOrThrow<string>("REGISTRAR_URL"),
            auth: () => this.accessToken,
        });
    }

    /**
     * Checks if the registrar service is enabled based on the configuration.
     * @returns True if the registrar service is enabled, false otherwise.
     */
    isEnabled() {
        return !!this.configService.get<string>("REGISTRAR_URL");
    }

    /**
     * This function is called when the application starts.
     * It will refresh the access token for the registrar.
     */
    async onApplicationBootstrap() {
        if (!this.configService.get<string>("REGISTRAR_URL")) {
            return;
        }
        await this.refreshAccessToken();
    }

    /**
     * This function is called when a tenant is initialized.
     * @param tenant
     */
    async onTenantInit(tenant: TenantEntity) {
        if (!this.isEnabled()) {
            return;
        }
        //TODO: pass name by call
        const name = tenant.name;
        const relyingPartyId = await this.addRp(name);
        const accessCertificateId = await this.addAccessCertificate(
            tenant.id,
            relyingPartyId,
        );
        await this.registrarRepository.save({
            tenantId: tenant.id,
            relyingPartyId,
            accessCertificateId,
        });
    }

    /**
     * Deletes all registrar entries for a specific tenant.
     * @param tenantId
     */
    async onTenantDelete(tenantId: string) {
        await this.registrarRepository.delete({ tenantId });
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
    addRp(name: string): Promise<string> {
        return relyingPartyControllerRegister({
            client: this.client,
            body: {
                name,
            },
        }).then(async (response) => {
            let rpId: string;
            if (response.error) {
                rpId = await this.getExistingRp(name);
            } else {
                rpId = response.data!["id"];
            }
            return rpId;
        });
    }

    /**
     * Stores the existing relying party ID based on the name.
     * This is used when the relying party already exists in the registrar.
     * @param name - The name of the relying party.
     * @returns The ID of the existing relying party.
     */
    private getExistingRp(name: string) {
        return relyingPartyControllerFindAll({
            client: this.client,
            query: {
                name,
            },
        }).then((response) => {
            return response.data!.find((item) => item.name === name)?.id!;
        });
    }

    /**
     * Add a new access certificate to the registrar.
     * This is only needed once, when the access certificate is created.
     * If the access certificate already exists, it will be returned.
     * @returns
     */
    private async addAccessCertificate(
        tenantId: string,
        relyingPartyId: string,
    ): Promise<string> {
        const keyId = await this.cryptoService.keyService.getKid(tenantId);
        const host = this.configService
            .getOrThrow<string>("PUBLIC_URL")
            .replace("https://", "");
        return accessCertificateControllerRegister({
            client: this.client,
            body: {
                publicKey: await this.cryptoService.keyService.getPublicKey(
                    "pem",
                    tenantId,
                    keyId,
                ),
                dns: [host],
            },
            path: {
                rp: relyingPartyId,
            },
        }).then(async (res) => {
            if (res.error) {
                console.error("Error adding access certificate:", res.error);
                throw new Error("Error adding access certificate");
            }
            //store the cert
            await this.cryptoService.storeAccessCertificate(
                res.data!["crt"],
                tenantId,
                keyId,
            );
            return res.data!["id"];
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
        const entry = await this.registrarRepository.findOneByOrFail({
            tenantId,
        });

        //TODO: need to check if the access certificate is bound to the access certificate with the subject. Also that the requested fields are matching.

        const certs =
            (await registrationCertificateControllerAll({
                client: this.client,
                path: {
                    rp: entry.relyingPartyId,
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
                rp: entry.relyingPartyId,
            },
            body: req.body,
        }).then(async (res) => {
            if (res.error) {
                console.error(
                    "Error adding registration certificate:",
                    res.error,
                );
                throw new Error("Error adding registration certificate");
            }

            //TODO: write the ID to the config so its easier to use it. Easier than writing the comparison algorithm (any maybe someone wants to use a different one)
            await this.presentationsService.storeRCID(
                res.data!["id"],
                requestId,
                tenantId,
            );
            return res.data!["jwt"];
        });
    }
}
