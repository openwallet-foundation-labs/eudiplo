import { HttpService } from '@nestjs/axios';
import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { digest, ES256 } from '@sd-jwt/crypto-nodejs';
import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import { KbVerifier, Verifier } from '@sd-jwt/types';
import { importJWK, JWK, JWTPayload, jwtVerify } from 'jose';
import { firstValueFrom } from 'rxjs';
import { ResolverService } from '../resolver/resolver.service';
import { ConfigService } from '@nestjs/config';
import {
    existsSync,
    readdirSync,
    readFileSync,
    rmdirSync,
    writeFileSync,
} from 'node:fs';
import { join, posix } from 'node:path';
import { VPRequest } from './dto/vp-request.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export interface AuthResponse {
    vp_token: {
        [key: string]: string;
    };
    state: string;
}

@Injectable()
export class PresentationsService implements OnModuleInit {
    sdjwtInstance: SDJwtVcInstance;
    private folder: string;

    constructor(
        private httpService: HttpService,
        private resolverService: ResolverService,
        private configService: ConfigService,
    ) {}
    onModuleInit() {
        this.sdjwtInstance = new SDJwtVcInstance({
            hasher: digest,
            verifier: this.verifier.bind(this),
            kbVerifier: this.kbVerifier.bind(this),
            statusListFetcher: this.statusListFetcher.bind(this),
        });
        this.httpService.get('');
        this.folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            'presentation',
        );
    }

    getPresentations() {
        const files = readdirSync(this.folder);
        return Promise.all(
            files.map((file) => {
                const id = file.replace('.json', '');
                return this.getPresentationRequest(id);
            }),
        );
    }

    storePresentationRequest(vprequest: VPRequest) {
        const safeId = posix
            .normalize(vprequest.id)
            .replace(/^(\.\.(\/|\\|$))+/, '');
        writeFileSync(
            join(this.folder, `${safeId}.json`),
            JSON.stringify(vprequest, null, 2),
        );
    }

    deletePresentationRequest(id: string) {
        const safeId = posix.normalize(id).replace(/^(\.\.(\/|\\|$))+/, '');
        const filePath = join(this.folder, `${safeId}.json`);
        if (!existsSync(filePath)) {
            throw new ConflictException(
                `Presentation request with id ${id} not found`,
            );
        }
        rmdirSync(filePath, { recursive: true });
    }

    /**
     * Get a presentation request by ID. The file is read from the filesystem and parsed into a valid VPRequest object.
     * @param requestId
     * @returns
     */
    async getPresentationRequest(requestId: string): Promise<VPRequest> {
        const safeId = posix
            .normalize(requestId)
            .replace(/^(\.\.(\/|\\|$))+/, '');
        if (!existsSync(join(this.folder, `${safeId}.json`))) {
            throw new ConflictException(`Request ID ${requestId} not found`);
        }
        const payload = readFileSync(
            join(this.folder, `${requestId}.json`),
            'utf-8',
        ).replace(
            /<PUBLIC_URL>/g,
            this.configService.getOrThrow<string>('PUBLIC_URL'),
        );
        const json = JSON.parse(payload);
        json.id = requestId; // Ensure the ID is set correctly
        const configInstance = plainToInstance(VPRequest, json);
        const errors = await validate(configInstance, {
            whitelist: true,
            forbidNonWhitelisted: true,
        });
        if (errors.length > 0) {
            throw new ConflictException(
                `Invalid credential configuration in file ${requestId}: ${errors
                    .map((error) => error.toString())
                    .join(', ')}`,
            );
        }
        return configInstance;
    }

    public storeRCID(id: string, requestId: string) {
        const safeId = posix
            .normalize(requestId)
            .replace(/^(\.\.(\/|\\|$))+/, '');
        const file = join(this.folder, `${safeId}.json`);
        const payload: VPRequest = JSON.parse(readFileSync(file, 'utf-8'));
        payload.registrationCert.id = id;
        writeFileSync(join(file), JSON.stringify(payload, null, 2));
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
