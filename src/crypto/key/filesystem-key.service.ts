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
import { execSync } from 'node:child_process';

/**
 * The key service is responsible for managing the keys of the issuer.
 */
@Injectable()
export class FileSystemKeyService implements KeyService {
    public signer!: Signer;
    private privateKey!: JWK;
    private publicKey!: JWK;

    private publicKeyInstance!: CryptoKey;
    private privateKeyInstance!: CryptoKey;

    private crypto: CryptoImplementation;

    private privateKeyPath = 'private-key.pem';
    private publicKeyPath = 'public-key.pem';

    constructor(
        private configService: ConfigService,
        private cryptoService: CryptoService,
    ) {
        this.crypto = this.cryptoService.getCrypto();
    }

    async onModuleInit(): Promise<void> {
        await this.init();
        this.signer = await this.crypto.getSigner(this.privateKey);
        this.privateKeyInstance = (await importJWK(
            this.privateKey,
            this.crypto.alg,
        )) as CryptoKey;
    }
    async init() {
        // get the keys
        const { privateKey, publicKey } = await this.getKeys();
        this.privateKey = privateKey;
        this.publicKey = publicKey;
    }

    /**
     * Get the keys from the file system or generate them if they do not exist
     * @returns
     */
    private async getKeys() {
        let privateKey: JWK;
        let publicKey: JWK;
        const folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
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
            this.publicKeyInstance = (await importJWK(
                publicKey,
                this.crypto.alg,
            )) as CryptoKey;
            writeFileSync(
                join(folder, this.privateKeyPath),
                await exportPKCS8((await importJWK(privateKey)) as CryptoKey),
            );
            writeFileSync(
                join(folder, this.publicKeyPath),
                await exportSPKI((await importJWK(publicKey)) as CryptoKey),
            );
            execSync(
                `openssl req -new -x509 \
        -key ${join(folder, this.privateKeyPath)} \
        -out ${join(folder, 'signing-certificate.pem')} \
        -subj "/CN=${this.configService.getOrThrow<string>('REGISTRAR_RP_NAME')}" \
        -addext "subjectAltName=URI:${this.configService.getOrThrow<string>('PUBLIC_URL')}"`,
            );
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
        this.publicKeyInstance = await importSPKI(
            readFileSync(join(folder, this.publicKeyPath), 'utf-8'),
            this.crypto.alg,
        );
        publicKey = await exportJWK(this.publicKeyInstance);
        return { privateKey, publicKey };
    }

    /**
     * Get the key id
     * @returns
     */
    getKid() {
        return Promise.resolve(this.publicKey.kid as string);
    }

    /**
     * Get the public key
     * @returns
     */
    getPublicKey(type: 'jwk'): Promise<JWK>;
    getPublicKey(type: 'pem'): Promise<string>;
    getPublicKey(type: 'pem' | 'jwk'): Promise<JWK | string> {
        if (type === 'pem') {
            return exportSPKI(this.publicKeyInstance);
        } else {
            return Promise.resolve(this.publicKey);
        }
    }

    async signJWT(payload: JWTPayload, header: JWTHeaderParameters) {
        return new SignJWT(payload)
            .setProtectedHeader(header)
            .sign(this.privateKeyInstance);
    }
}
