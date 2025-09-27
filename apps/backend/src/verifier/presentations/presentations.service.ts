import { HttpService } from "@nestjs/axios";
import {
    ConflictException,
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { digest } from "@sd-jwt/crypto-nodejs";
import { SDJwtVcInstance } from "@sd-jwt/sd-jwt-vc";
import { KbVerifier, Verifier } from "@sd-jwt/types";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import { readdirSync, readFileSync } from "fs";
import { JWK, JWTPayload } from "jose";
import { PinoLogger } from "nestjs-pino";
import { join } from "path";
import { firstValueFrom } from "rxjs";
import { Repository } from "typeorm/repository/Repository";
import { CryptoImplementationService } from "../../crypto/key/crypto-implementation/crypto-implementation.service";
import { ResolverService } from "../resolver/resolver.service";
import { AuthResponse } from "./dto/auth-response.dto";
import { PresentationConfigCreateDto } from "./dto/presentation-config-create.dto";
import { PresentationConfig } from "./entities/presentation-config.entity";

/**
 * Service for managing Verifiable Presentations (VPs) and handling SD-JWT-VCs.
 */
@Injectable()
export class PresentationsService implements OnApplicationBootstrap {
    /**
     * Instance of SDJwtVcInstance for handling SD-JWT-VCs.
     */
    sdjwtInstance: SDJwtVcInstance;

    /**
     * Constructor for the PresentationsService.
     * @param httpService - Instance of HttpService for making HTTP requests.
     * @param resolverService - Instance of ResolverService for resolving DID documents.
     * @param vpRequestRepository - Repository for managing VP request configurations.
     */
    constructor(
        private httpService: HttpService,
        private resolverService: ResolverService,
        @InjectRepository(PresentationConfig)
        private vpRequestRepository: Repository<PresentationConfig>,
        private configService: ConfigService,
        private logger: PinoLogger,
        private cryptoService: CryptoImplementationService,
    ) {}

    /**
     * Imports presentation configurations from a predefined directory structure.
     */
    async onApplicationBootstrap() {
        this.sdjwtInstance = new SDJwtVcInstance({
            hasher: digest,
            verifier: this.verifier.bind(this),
            kbVerifier: this.kbVerifier.bind(this),
            statusListFetcher: this.statusListFetcher.bind(this),
        });
        await this.import();
    }

    /**
     * Imports presentation configurations from a predefined directory structure.
     */
    private async import() {
        const configPath = this.configService.getOrThrow("CONFIG_FOLDER");
        const subfolder = "presentation";
        const force = this.configService.get<boolean>("CONFIG_IMPORT_FORCE");
        if (this.configService.get<boolean>("CONFIG_IMPORT")) {
            const tenantFolders = readdirSync(configPath, {
                withFileTypes: true,
            }).filter((tenant) => tenant.isDirectory());
            for (const tenant of tenantFolders) {
                let counter = 0;
                //iterate over all elements in the folder and import them
                const path = join(configPath, tenant.name, subfolder);
                const files = readdirSync(path);
                for (const file of files) {
                    const payload = JSON.parse(
                        readFileSync(join(path, file), "utf8"),
                    );

                    const id = file.replace(".json", "");
                    payload.id = id;
                    const presentationExists = await this.getPresentationConfig(
                        id,
                        tenant.name,
                    ).catch(() => false);
                    if (presentationExists && !force) {
                        continue; // Skip if config already exists and force is not set
                    } else if (presentationExists && force) {
                        //delete old element so removed elements are not present
                        await this.vpRequestRepository.delete({
                            id,
                            tenantId: tenant.name,
                        });
                    }

                    // Validate the payload against PresentationConfig
                    const config = plainToClass(
                        PresentationConfigCreateDto,
                        payload,
                    );
                    const validationErrors = await validate(config, {
                        whitelist: true,
                        forbidUnknownValues: false, // avoid false positives on plain objects
                        forbidNonWhitelisted: false,
                        stopAtFirstError: false,
                    });

                    if (validationErrors.length > 0) {
                        this.logger.error(
                            {
                                event: "ValidationError",
                                file,
                                tenant: tenant.name,
                                errors: validationErrors.map((error) => ({
                                    property: error.property,
                                    constraints: error.constraints,
                                    value: error.value,
                                })),
                            },
                            `Validation failed for presentation config ${file} in tenant ${tenant.name}`,
                        );
                        continue; // Skip this invalid config
                    }

                    await this.storePresentationConfig(tenant.name, config);
                    counter++;
                }
                this.logger.info(
                    {
                        event: "Import",
                    },
                    `${counter} presentation configs imported for ${tenant.name}`,
                );
            }
        }
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
        element.registrationCert!.id = registrationCertId;
        await this.vpRequestRepository.save(element);
    }

    /**
     * Verifier for SD-JWT-VCs. It will verify the signature of the SD-JWT-VC and return true if it is valid.
     * @param data - The data part of the SD-JWT-VC.
     * @param signature - The signature of the SD-JWT-VC.
     * @returns
     */
    verifier: Verifier = async (data, signature) => {
        const instance = new SDJwtVcInstance({
            hasher: digest,
        });
        const decodedVC = await instance.decode(`${data}.${signature}`);
        const payload = decodedVC.jwt?.payload as JWTPayload;
        const header = decodedVC.jwt?.header as JWK;
        const publicKey = await this.resolverService.resolvePublicKey(
            payload,
            header,
        );
        const crypto = this.cryptoService.getCryptoFromJwk(publicKey); // just to check if we support the key
        const verify = await crypto.getVerifier(publicKey);
        return verify(data, signature).catch((err) => {
            console.log(err);
            return false;
        });
    };

    /**
     * Fetch the status list from the uri.
     * @param uri
     * @returns
     */
    private statusListFetcher: (uri: string) => Promise<string> = (
        uri: string,
    ) => {
        return firstValueFrom(this.httpService.get<string>(uri)).then(
            (res) => res.data,
        );
    };

    /**
     * Verifier for keybindings. It will verify the signature of the keybinding and return true if it is valid.
     * @param data
     * @param signature
     * @param payload
     * @returns
     */
    private kbVerifier: KbVerifier = async (data, signature, payload) => {
        if (!payload.cnf) {
            throw new Error("No cnf found in the payload");
        }
        const jwk: JWK = (payload.cnf as any).jwk;
        const crypto = this.cryptoService.getCryptoFromJwk(jwk);
        const verifier = await crypto.getVerifier(jwk);
        return verifier(data, signature);
    };

    /**
     * Parse the response from the wallet. It will verify the SD-JWT-VCs in the vp_token and return the parsed attestations.
     * @param res
     * @param requiredFields
     * @returns
     */
    parseResponse(
        res: AuthResponse,
        requiredFields: string[],
        keyBindingNonce: string,
    ) {
        const attestations = Object.keys(res.vp_token);
        const att = attestations.map((att) =>
            this.sdjwtInstance
                .verify(res.vp_token[att], {
                    requiredClaimKeys: requiredFields,
                    keyBindingNonce,
                })
                .then(
                    (result) => {
                        return {
                            id: att,
                            values: {
                                ...result.payload,
                                cnf: undefined, // remove cnf for simplicity
                                status: undefined, // remove status for simplicity
                            },
                        };
                    },
                    /* (err) => {
                        throw new Error
                        //(console.log(err);
                        return {
                            id: att,
                            error: err.message,
                        };
                    }, */
                ),
        );
        return Promise.all(att);
    }
}
