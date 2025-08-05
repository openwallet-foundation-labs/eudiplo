import { Injectable } from '@nestjs/common';
import { KeyObj, KeyService } from './key.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { importSPKI, exportJWK, JWTHeaderParameters, JWK } from 'jose';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, Signer } from '@sd-jwt/types';
import {
    CryptoImplementationService,
    CryptoType,
} from './crypto/crypto.service';
import { join } from 'path';
import { KeyImportDto } from './dto/key-import.dto';
import { v4 } from 'uuid';
import { CertEntity } from './entities/cert.entity';
import { Repository } from 'typeorm/repository/Repository';

@Injectable()
export class VaultKeyService extends KeyService {
    // url to the vault instance
    private vaultUrl: string;
    // headers for the vault api
    private headers: { headers: { 'X-Vault-Token': string } };

    private folder: string;

    constructor(
        private httpService: HttpService,
        configService: ConfigService,
        private cryptoService: CryptoImplementationService,
        certRepository: Repository<CertEntity>,
    ) {
        super(configService, certRepository);
        this.folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            'keys',
        );

        this.vaultUrl = this.configService.get<string>('VAULT_URL') as string;
        this.headers = {
            headers: {
                'X-Vault-Token': this.configService.get<string>(
                    'VAULT_TOKEN',
                ) as string,
            },
        };
    }

    /**
     * Create a new transit for the tenant.
     * @param tenantId
     */
    async init(tenantId: string) {
        //TODO: what to do when it throws an error e.g. when the transit already exists?
        await firstValueFrom(
            this.httpService.post(
                `${this.vaultUrl}/v1/sys/mounts/keys/${tenantId}`,
                {
                    type: 'transit',
                },
                this.headers,
            ),
        ).catch((err) => {
            console.error(JSON.stringify(err.response.data, null, 2));
        });
        await this.create(tenantId);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    import(tenantId: string, body: KeyImportDto): Promise<string> {
        throw new Error('Method not implemented.');
    }

    getKeys(tenantId: string): Promise<KeyObj[]> {
        return firstValueFrom(
            this.httpService.get<any>(
                `${this.vaultUrl}/v1/${tenantId}/keys?list=true`,
                this.headers,
            ),
        ).then((res) => {
            //TODO: get all the public keys from the vault
            return Promise.all(
                res.data.data.keys.map(async (id: string) => {
                    const publicKey = await this.getPublicKey(
                        'pem',
                        tenantId,
                        id,
                    );
                    const crt = await this.getCertificate(tenantId, id);
                    return {
                        id,
                        publicKey,
                        crt,
                    } as KeyObj;
                }),
            );
        });
    }

    /**
     * Get the signer for the key service
     */
    signer(tenantId: string): Promise<Signer> {
        //TODO: validate if this is correct.
        return Promise.resolve((input: string) => this.sign(input, tenantId));
    }

    /**
     * Creates a new keypair in the vault
     * @param createKeyDto
     * @param user
     * @returns
     */
    async create(tenantId: string) {
        const types: Map<CryptoType, string> = new Map();
        types.set('ES256', 'ecdsa-p256');
        types.set('Ed25519', 'ed25519');
        const id = v4();
        await firstValueFrom(
            this.httpService.post(
                `${this.vaultUrl}/v1/${tenantId}/keys/${id}`,
                {
                    exportable: false,
                    type: types.get(this.cryptoService.getAlg()),
                },
                this.headers,
            ),
        );
        return id;
    }

    /**
     * Get all keys and take the first one.
     * @param tenantId
     * @returns
     */
    getKid(tenantId: string): Promise<string> {
        return firstValueFrom(
            this.httpService.get<any>(
                `${this.vaultUrl}/v1/${tenantId}/keys?list=true`,
                this.headers,
            ),
        ).then(
            (res) => {
                if (
                    !res.data.data.keys ||
                    (res.data.data.keys as string[]).length === 0
                ) {
                    throw new Error('No keys found');
                }
                return (res.data.data.keys as string[])[0];
            },
            (err) => {
                throw new Error(
                    `Error getting keys for tenant ${tenantId}: ${err.message}`,
                );
            },
        );
    }

    /**
     * Gets the public key and converts it to a KeyLike object.
     * @param id
     * @returns
     */
    async getPublicKey(
        type: 'pem',
        tenantId: string,
        keyId?: string,
    ): Promise<string>;
    async getPublicKey(
        type: 'jwk',
        tenantId: string,
        keyId: string,
    ): Promise<JWK>;
    async getPublicKey(
        type: 'jwk' | 'pem',
        tenantId: string,
        keyId?: string,
    ): Promise<JWK | string> {
        if (!keyId) {
            keyId = await this.getKid(tenantId);
        }

        return firstValueFrom(
            this.httpService.get<any>(
                `${this.vaultUrl}/v1/${tenantId}/keys/${keyId}`,
                this.headers,
            ),
        ).then(async (res) => {
            return type === 'pem'
                ? (res.data.data.keys['1'].public_key as string)
                : await this.getJWK(
                      res.data.data.keys['1'].public_key,
                      tenantId,
                  );
        });
    }

    private getJWK(key: string, tenantId: string): Promise<JWK> {
        return importSPKI(key, this.cryptoService.getAlg())
            .then((cryptoKey) => exportJWK(cryptoKey))
            .then(async (jwk) => {
                jwk.kid = await this.getKid(tenantId);
                return jwk;
            });
    }

    /**
     * Signs a value with a key in the vault.
     * @param id
     * @param user
     * @param value
     * @returns
     */
    async sign(
        value: string,
        tenantId: string,
        keyId?: string,
    ): Promise<string> {
        if (!keyId) {
            keyId = await this.getKid(tenantId);
        }
        return firstValueFrom(
            this.httpService.post(
                `${this.vaultUrl}/v1/${tenantId}/sign/${keyId}`,
                {
                    input: Buffer.from(value).toString('base64'),
                },
                this.headers,
            ),
        ).then((res) =>
            this.derToJwtSignature(res.data.data.signature.split(':')[2]),
        );
    }

    /**
     * Creates a proof of possession jwt.
     * @param user
     * @param value
     */
    async signJWT(
        payload: JwtPayload,
        header: JWTHeaderParameters,
        tenantId: string,
        keyId?: string,
    ): Promise<string> {
        // Convert header and payload to Base64 to prepare for Vault
        const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
            'base64url',
        );
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
            'base64url',
        );
        const signingInput = `${encodedHeader}.${encodedPayload}`;

        // Request to Vault for signing
        try {
            const signature = await this.sign(signingInput, tenantId, keyId);
            return `${encodedHeader}.${encodedPayload}.${signature}`;
        } catch (error) {
            console.error('Error signing JWT with Vault:', error);
            throw error;
        }
    }

    /**
     * Converts a DER signature to a JWT signature.
     * @param derSignature
     * @returns
     */
    derToJwtSignature(derSignature: string) {
        // Step 1: Extract r and s from DER signature
        const der = Buffer.from(derSignature, 'base64');
        const sequence = der.slice(2); // Skip the sequence tag and length
        const rLength = sequence[1];
        const r = sequence.slice(2, 2 + rLength);
        const s = sequence.slice(2 + rLength + 2); // Skip r, its tag and length byte, and s's tag and length byte

        // Step 2: Ensure r and s are 32 bytes each (pad with zeros if necessary)
        // Ensure r and s are 32 bytes each
        let rPadded: Buffer;
        let sPadded: Buffer;
        if (r.length > 32) {
            if (r.length === 33 && r[0] === 0x00) {
                rPadded = r.slice(1);
            } else {
                throw new Error('Invalid r length in DER signature');
            }
        } else {
            rPadded = Buffer.concat([Buffer.alloc(32 - r.length), r]);
        }
        if (s.length > 32) {
            if (s.length === 33 && s[0] === 0x00) {
                sPadded = s.slice(1);
            } else {
                throw new Error('Invalid s length in DER signature');
            }
        } else {
            sPadded = Buffer.concat([Buffer.alloc(32 - s.length), s]);
        }

        // Step 3: Concatenate r and s to form the raw signature
        const rawSignature = Buffer.concat([rPadded, sPadded]);

        // Step 4: Base64url encode the raw signature
        return rawSignature
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
}
