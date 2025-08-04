import {
    existsSync,
    mkdirSync,
    writeFileSync,
    readFileSync,
    readdirSync,
} from 'node:fs';
import {
    JWK,
    JWTHeaderParameters,
    JWTPayload,
    CryptoKey,
    SignJWT,
    importJWK,
    exportSPKI,
    exportJWK,
} from 'jose';
import { v4 } from 'uuid';
import { KeyEntity, KeyService } from './key.service';
import { Injectable } from '@nestjs/common';
import { Signer } from '@sd-jwt/types';
import { ConfigService } from '@nestjs/config';
import { CryptoImplementation } from './crypto/crypto-implementation';
import { CryptoService } from './crypto/crypto.service';
import { join } from 'node:path';
import { KeyImportDto } from './dto/key-import.dto';

/**
 * The key service is responsible for managing the keys of the issuer.
 */
@Injectable()
export class FileSystemKeyService implements KeyService {
    private crypto: CryptoImplementation;

    constructor(
        private configService: ConfigService,
        private cryptoService: CryptoService,
    ) {
        this.crypto = this.cryptoService.getCrypto();
    }

    /**
     * Import a key into the key service.
     * @param tenantId
     * @param body
     * @returns
     */
    import(tenantId: string, body: KeyImportDto): Promise<string> {
        const folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            'keys',
            'keys',
        );
        if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
        }

        const privateKey = body.privateKey;
        writeFileSync(
            join(folder, `${privateKey.kid}.json`),
            JSON.stringify(privateKey, null, 2),
        );

        return Promise.resolve(privateKey.kid);
    }

    /**
     * Returns the keys for the given tenant.
     * @param tenantId
     * @returns
     */
    getKeys(tenantId: string): Promise<KeyEntity[]> {
        const folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            'keys',
            'keys',
        );
        if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
        }
        const files = readdirSync(folder);
        const keys: KeyEntity[] = [];
        for (const file of files) {
            const keyData = readFileSync(join(folder, file), 'utf-8');
            const privateKey = JSON.parse(keyData) as JWK;

            const publicKey = this.getPubFromPrivateKey(privateKey);
            const crt = this.getCertificate(tenantId, privateKey.kid as string);
            keys.push({ id: privateKey.kid as string, publicKey, crt });
        }
        return Promise.resolve(keys);
    }

    /**
     * Get the puvlic key from the private key.
     * @param privateKey
     * @returns
     */
    private getPubFromPrivateKey(privateKey: JWK): JWK {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { d, key_ops, ext, ...publicKey } = privateKey;
        return publicKey;
    }

    /**
     * Get the certificate for the given key id.
     * @param tenantId
     * @param keyId
     * @returns
     */
    private getCertificate(tenantId: string, keyId: string): string {
        const file = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            'keys',
            'certs',
            `${keyId}.pem`,
        );

        if (!existsSync(file)) {
            throw new Error(`Certificate not found for key ${keyId}`);
        }
        return readFileSync(file, 'utf-8');
    }

    /**
     * Initialize the key service for a specific tenant.
     * This will create the keys if they do not exist.
     * @param tenant
     */
    async init(tenant: string) {
        await this.getKid(tenant).catch(async () => {
            // If no key exists, create a new one
            await this.create(tenant);
        });
        return Promise.resolve();
    }

    /**
     * Creates a new keypair and wrtites the private key to the file system.
     * @param tenantId
     * @returns key id of the generated key.
     */
    async create(tenantId: string): Promise<string> {
        const folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            'keys',
            'keys',
        );
        if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
        }

        const keys = await this.crypto.generateKeyPair();
        const privateKey = keys.privateKey as JWK;
        //add a random key id for reference
        privateKey.kid = v4();
        privateKey.alg = this.crypto.alg;
        writeFileSync(
            join(folder, `${privateKey.kid}.json`),
            JSON.stringify(privateKey, null, 2),
        );
        return privateKey.kid;
    }

    /**
     * Get the signer for the key service
     */
    async signer(tenantId: string, keyId?: string): Promise<Signer> {
        const privateKey = await this.getPrivateKey(tenantId, keyId);
        return this.crypto.getSigner(privateKey);
    }

    /**
     * Get the keys from the file system or generate them if they do not exist
     * @returns
     */
    private async getPrivateKey(tenantId: string, keyId?: string) {
        keyId = keyId || (await this.getKid(tenantId));
        // use the first key that is stored there.
        const folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            'keys',
            'keys',
        );
        if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
        }
        const file = join(folder, `${keyId}.json`);
        if (!existsSync(file)) {
            // If the file does not exist, generate a new keypair
            await this.create(tenantId);
        }
        const keyData = readFileSync(file, 'utf-8');
        const privateKey = JSON.parse(keyData) as JWK;
        return privateKey;
    }

    /**
     * Gets one key id for the tenant.
     * If no key exists, it will throw an error.
     * @returns
     */
    getKid(tenantId: string): Promise<string> {
        const folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            'keys',
            'keys',
        );
        if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
        }
        const files = readdirSync(folder);
        if (files.length === 0) {
            return Promise.reject(
                new Error(`No keys found for tenant ${tenantId}`),
            );
        }
        // Return the first key id found
        const firstFile = files[0];
        //check if the file includes the kid
        const keyData = readFileSync(join(folder, firstFile), 'utf-8');
        const privateKey = JSON.parse(keyData) as JWK;
        if (privateKey.kid) {
            return Promise.resolve(privateKey.kid);
        }
        return Promise.reject(new Error('Key id not found'));
    }

    /**
     * Get the public key
     * @returns
     */
    getPublicKey(type: 'jwk', tenantId: string, keyId?: string): Promise<JWK>;
    getPublicKey(
        type: 'pem',
        tenantId: string,
        keyId?: string,
    ): Promise<string>;
    async getPublicKey(
        type: 'pem' | 'jwk',
        tenantId: string,
        keyId?: string,
    ): Promise<JWK | string> {
        const privateKey = await this.getPrivateKey(tenantId, keyId);

        // Convert the private key to a public key
        // First import the private key as a CryptoKey
        const privateKeyInstance = await importJWK(
            privateKey,
            this.cryptoService.getAlg(),
            { extractable: true },
        );

        // Export it as a JWK to get the public key components
        const privateKeyJWK = await exportJWK(privateKeyInstance);

        // Remove private key components to get only the public key

        const publicKey = this.getPubFromPrivateKey(privateKeyJWK);

        if (type === 'pem') {
            // Import the public key and export as PEM
            const publicKeyInstance = await importJWK(
                publicKey,
                this.cryptoService.getAlg(),
                { extractable: true },
            );
            return exportSPKI(publicKeyInstance as CryptoKey);
        } else {
            return publicKey;
        }
    }

    async signJWT(
        payload: JWTPayload,
        header: JWTHeaderParameters,
        tenantId: string,
        keyId?: string,
    ): Promise<string> {
        const privateKey = await this.getPrivateKey(tenantId, keyId);
        const privateKeyInstance = (await importJWK(privateKey)) as CryptoKey;
        return new SignJWT(payload)
            .setProtectedHeader(header)
            .sign(privateKeyInstance);
    }
}
