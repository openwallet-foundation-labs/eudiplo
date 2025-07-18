import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import {
    JWK,
    JWTHeaderParameters,
    JWTPayload,
    CryptoKey,
    SignJWT,
    importJWK,
    exportPKCS8,
    exportSPKI,
    importPKCS8,
    importSPKI,
    exportJWK,
} from 'jose';
import { v4 } from 'uuid';
import { KeyService } from './key.service';
import { Injectable } from '@nestjs/common';
import { Signer } from '@sd-jwt/types';
import { ConfigService } from '@nestjs/config';
import { CryptoImplementation } from './crypto/crypto-implementation';
import { CryptoService } from './crypto/crypto.service';
import { join } from 'node:path';

/**
 * The key service is responsible for managing the keys of the issuer.
 */
@Injectable()
export class FileSystemKeyService implements KeyService {
    private crypto: CryptoImplementation;

    private privateKeyPath = 'private-key.pem';
    private publicKeyPath = 'public-key.pem';

    constructor(
        private configService: ConfigService,
        private cryptoService: CryptoService,
    ) {
        this.crypto = this.cryptoService.getCrypto();
    }

    async onModuleInit(): Promise<void> {}
    async init(tenant: string) {
        // Initialize the key service for a specific tenant
        // This will create the keys if they do not exist
        await this.getKeys(tenant);
    }

    /**
     * Get the signer for the key service
     */
    async signer(tenantId: string): Promise<Signer> {
        const keys = await this.getKeys(tenantId);
        return this.crypto.getSigner(keys.privateKey);
    }

    /**
     * Get the keys from the file system or generate them if they do not exist
     * @returns
     */
    private async getKeys(tenantId: string) {
        let privateKey: JWK;
        let publicKey: JWK;
        const folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            'keys',
        );
        if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
        }
        if (
            !existsSync(join(folder, this.privateKeyPath)) &&
            !existsSync(join(folder, this.publicKeyPath))
        ) {
            const keys = await this.crypto.generateKeyPair();
            privateKey = keys.privateKey as JWK;
            publicKey = keys.publicKey as JWK;
            //add a random key id for reference
            publicKey.kid = v4();
            privateKey.kid = publicKey.kid;
            privateKey.alg = this.crypto.alg;
            publicKey.alg = this.crypto.alg;
            writeFileSync(
                join(folder, this.privateKeyPath),
                await exportPKCS8((await importJWK(privateKey)) as CryptoKey),
            );
            writeFileSync(
                join(folder, this.publicKeyPath),
                await exportSPKI((await importJWK(publicKey)) as CryptoKey),
            );
            return { privateKey, publicKey };
        }

        privateKey = await exportJWK(
            await importPKCS8(
                readFileSync(join(folder, this.privateKeyPath), 'utf-8'),
                this.crypto.alg,
                {
                    extractable: true,
                },
            ),
        );
        //should be stored the cert
        privateKey.alg = this.crypto.alg;
        publicKey = await exportJWK(
            await importSPKI(
                readFileSync(join(folder, this.publicKeyPath), 'utf-8'),
                this.crypto.alg,
            ),
        );
        return { privateKey, publicKey };
    }

    /**
     * Get the key id
     * @returns
     */
    getKid(tenantId: string): Promise<string> {
        return this.getKeys(tenantId).then((keys) => {
            if (keys.publicKey.kid) {
                return keys.publicKey.kid;
            }
            throw new Error('Key id not found');
        });
    }

    /**
     * Get the public key
     * @returns
     */
    getPublicKey(type: 'jwk', tenantId: string): Promise<JWK>;
    getPublicKey(type: 'pem', tenantId: string): Promise<string>;
    async getPublicKey(
        type: 'pem' | 'jwk',
        tenantId: string,
    ): Promise<JWK | string> {
        const keys = await this.getKeys(tenantId);
        if (type === 'pem') {
            return exportSPKI(
                (await importJWK(
                    keys.publicKey,
                    this.cryptoService.getAlg(),
                )) as CryptoKey,
            );
        } else {
            return Promise.resolve(keys.publicKey);
        }
    }

    async signJWT(
        payload: JWTPayload,
        header: JWTHeaderParameters,
        tenantId: string,
    ): Promise<string> {
        const keys = await this.getKeys(tenantId);
        const privateKeyInstance = (await importJWK(
            keys.privateKey,
        )) as CryptoKey;
        return new SignJWT(payload)
            .setProtectedHeader(header)
            .sign(privateKeyInstance);
    }
}
