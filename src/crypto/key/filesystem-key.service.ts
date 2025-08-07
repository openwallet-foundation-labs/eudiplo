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
import { KeyObj, KeyService } from './key.service';
import { ConflictException, Injectable } from '@nestjs/common';
import { Signer } from '@sd-jwt/types';
import { ConfigService } from '@nestjs/config';
import { CryptoImplementation } from './crypto/crypto-implementation';
import { CryptoImplementationService } from './crypto/crypto.service';
import { join } from 'node:path';
import { KeyImportDto } from './dto/key-import.dto';
import { CertEntity, CertificateType } from './entities/cert.entity';
import { Repository } from 'typeorm/repository/Repository';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { PinoLogger } from 'nestjs-pino';

/**
 * The key service is responsible for managing the keys of the issuer.
 */
@Injectable()
export class FileSystemKeyService extends KeyService {
    private crypto: CryptoImplementation;

    constructor(
        configService: ConfigService,
        private cryptoService: CryptoImplementationService,
        certRepository: Repository<CertEntity>,
        private logger: PinoLogger,
    ) {
        super(configService, certRepository);
        this.crypto = cryptoService.getCrypto();
    }

    async importFromFileSystem() {
        if (this.configService.get<boolean>('CONFIG_IMPORT')) {
            const configPath = this.configService.getOrThrow('CONFIG_FOLDER');
            const subfolder = 'keys';
            const force = this.configService.get<boolean>(
                'CONFIG_IMPORT_FORCE',
            );
            if (this.configService.get<boolean>('CONFIG_IMPORT')) {
                const tenantFolders = readdirSync(configPath, {
                    withFileTypes: true,
                }).filter((tenant) => tenant.isDirectory());
                let counter = 0;
                for (const tenant of tenantFolders) {
                    //iterate over all elements in the folder and import them
                    const path = join(configPath, tenant.name, subfolder);
                    const files = readdirSync(path);
                    for (const file of files) {
                        const payload = JSON.parse(
                            readFileSync(join(path, file), 'utf8'),
                        );

                        const id = file.replace('.json', '');
                        const exists = await this.getPrivateKey(
                            tenant.name,
                            id,
                        ).catch(() => false);
                        if (exists && !force) {
                            continue; // Skip if config already exists and force is not set
                        }

                        // Validate the payload against KeyImportDto
                        const config = plainToClass(KeyImportDto, payload);
                        const validationErrors = await validate(config, {
                            whitelist: true,
                            forbidNonWhitelisted: true,
                        });

                        if (validationErrors.length > 0) {
                            this.logger.error(
                                {
                                    event: 'ValidationError',
                                    file,
                                    tenant: tenant.name,
                                    errors: validationErrors.map((error) => ({
                                        property: error.property,
                                        constraints: error.constraints,
                                        value: error.value,
                                    })),
                                },
                                `Validation failed for key config ${file} in tenant ${tenant.name}`,
                            );
                            continue; // Skip this invalid config
                        }
                        await this.import(tenant.name, config);
                        counter++;
                    }
                    this.logger.info(
                        {
                            event: 'Import',
                        },
                        `${counter} keys imported for ${tenant.name}`,
                    );
                }
            }
        }
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
    async getKeys(tenantId: string): Promise<KeyObj[]> {
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
        const keys: KeyObj[] = [];
        for (const file of files) {
            const keyData = readFileSync(join(folder, file), 'utf-8');
            const privateKey = JSON.parse(keyData) as JWK;

            const publicKey = this.getPubFromPrivateKey(privateKey);
            const crt = await this.getCertificate(
                tenantId,
                privateKey.kid as string,
            );
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
     * Initialize the key service for a specific tenant.
     * This will create the keys if they do not exist.
     * @param tenant
     */
    init(tenant: string): Promise<string> {
        return this.getKid(tenant).catch(async () => this.create(tenant));
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

        //remove exportable and key_ops from the private key
        delete privateKey.ext;
        delete privateKey.key_ops;

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
        if (!existsSync(file)) {
            throw new ConflictException(`Key ${file} does not exist`);
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
    getKid(
        tenantId: string,
        type: CertificateType = 'signing',
    ): Promise<string> {
        return this.certRepository
            .findOneByOrFail({
                tenantId,
                type,
            })
            .then((cert) => cert.keyId);
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
