import { HttpService } from '@nestjs/axios';
import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { digest, ES256 } from '@sd-jwt/crypto-nodejs';
import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import { KbVerifier, Verifier } from '@sd-jwt/types';
import { importJWK, JWK, JWTPayload, jwtVerify } from 'jose';
import { firstValueFrom } from 'rxjs';
import { ResolverService } from '../resolver/resolver.service';
import { PresentationConfig } from './entities/presentation-config.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm/repository/Repository';
import { AuthResponse } from './dto/auth-response.dto';

/**
 * Service for managing Verifiable Presentations (VPs) and handling SD-JWT-VCs.
 */
@Injectable()
export class PresentationsService implements OnModuleInit {
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
    ) {}

    /**
     * Initializes the SDJwtVcInstance with the necessary configurations.
     */
    onModuleInit() {
        this.sdjwtInstance = new SDJwtVcInstance({
            hasher: digest,
            verifier: this.verifier.bind(this),
            kbVerifier: this.kbVerifier.bind(this),
            statusListFetcher: this.statusListFetcher.bind(this),
        });
    }

    /**
     * Retrieves all presentation configurations for a given tenant.
     * @param tenantId - The ID of the tenant for which to retrieve configurations.
     * @returns A promise that resolves to an array of PresentationConfig entities.
     */
    getPresentationConfigs(tenantId: string): Promise<PresentationConfig[]> {
        return this.vpRequestRepository.find({
            where: { tenantId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Stores a new presentation configuration.
     * @param vprequest - The PresentationConfig entity to store.
     * @param tenantId - The ID of the tenant for which to store the configuration.
     * @returns A promise that resolves to the stored PresentationConfig entity.
     */
    storePresentationConfig(vprequest: PresentationConfig, tenantId: string) {
        vprequest.tenantId = tenantId;
        return this.vpRequestRepository.save(vprequest);
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
    async getPresentationConfig(
        id: string,
        tenantId: string,
    ): Promise<PresentationConfig> {
        return this.vpRequestRepository
            .findOneByOrFail({
                id,
                tenantId,
            })
            .catch(() => {
                throw new ConflictException('Request ID invalid not found');
            });
    }

    /**
     * Stores the new registration certificate.
     * @param registrationCertId - The ID of the registration certificate to store.
     * @param id - The ID of the presentation configuration to update.
     * @param tenantId - The ID of the tenant for which to store the registration certificate.
     * @returns
     */
    public storeRCID(registrationCertId: string, id: string, tenantId: string) {
        return this.vpRequestRepository.update(
            { id, tenantId },
            { registrationCert: { id: registrationCertId } },
        );
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
        const verify = await ES256.getVerifier(publicKey);
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
    private statusListFetcher: (uri: string) => Promise<string> = async (
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
            throw new Error('No cnf found in the payload');
        }
        const key = await importJWK(payload.cnf.jwk as JWK, 'ES256');
        return jwtVerify(`${data}.${signature}`, key).then(
            () => true,
            () => false,
        );
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
