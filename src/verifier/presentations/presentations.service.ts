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

export interface AuthResponse {
    vp_token: {
        [key: string]: string;
    };
    state: string;
}

@Injectable()
export class PresentationsService implements OnModuleInit {
    sdjwtInstance: SDJwtVcInstance;

    constructor(
        private httpService: HttpService,
        private resolverService: ResolverService,
        @InjectRepository(PresentationConfig)
        private vpRequestRepository: Repository<PresentationConfig>,
    ) {}
    onModuleInit() {
        this.sdjwtInstance = new SDJwtVcInstance({
            hasher: digest,
            verifier: this.verifier.bind(this),
            kbVerifier: this.kbVerifier.bind(this),
            statusListFetcher: this.statusListFetcher.bind(this),
        });
    }

    getPresentationConfigs(tenantId: string): Promise<PresentationConfig[]> {
        return this.vpRequestRepository.find({
            where: { tenantId },
            order: { createdAt: 'DESC' },
        });
    }

    storePresentationConfig(vprequest: PresentationConfig, tenantId: string) {
        vprequest.tenantId = tenantId;
        return this.vpRequestRepository.save(vprequest);
    }

    /**
     * @param id
     * @param tenantId
     * @returns
     */
    deletePresentationConfig(id: string, tenantId: string) {
        return this.vpRequestRepository.delete({ id, tenantId });
    }

    /**
     * Get a presentation request by ID. The file is read from the filesystem and parsed into a valid VPRequest object.
     * @param requestId
     * @returns
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
     * @param registrationCertId
     * @param id
     * @param tenantId
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
     * @param data
     * @param signature
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
                    (err) => ({
                        // when the verification fails, it will return an error object                (err) => ({
                        id: att,
                        error: err.message,
                    }),
                ),
        );
        return Promise.all(att);
    }
}
