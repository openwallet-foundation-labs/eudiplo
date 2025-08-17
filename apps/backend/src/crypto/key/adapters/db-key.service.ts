import { ConfigService } from "@nestjs/config";
import { Signer } from "@sd-jwt/types";
import {
    CryptoKey,
    exportJWK,
    exportSPKI,
    importJWK,
    JWK,
    JWK_EC_Private,
    JWTHeaderParameters,
    JWTPayload,
    SignJWT,
} from "jose";
import { Repository } from "typeorm/repository/Repository";
import { v4 } from "uuid";
import { EC_Public } from "../../../well-known/dto/jwks-response.dto";
import { CryptoImplementation } from "../crypto-implementation/crypto-implementation";
import { CryptoImplementationService } from "../crypto-implementation/crypto-implementation.service";
import { KeyImportDto } from "../dto/key-import.dto";
import { CertEntity, CertificateType } from "../entities/cert.entity";
import { KeyEntity } from "../entities/keys.entity";
import { KeyService } from "../key.service";

/**
 * The key service is responsible for managing the keys of the issuer.
 */
export class DBKeyService extends KeyService {
    private crypto: CryptoImplementation;

    constructor(
        configService: ConfigService,
        private cryptoService: CryptoImplementationService,
        certRepository: Repository<CertEntity>,
        private keyRepository: Repository<KeyEntity>,
    ) {
        super(configService, certRepository);
        this.crypto = cryptoService.getCrypto();
    }

    /**
     * Import a key into the key service.
     * @param tenantId
     * @param body
     * @returns
     */
    import(tenantId: string, body: KeyImportDto): Promise<string> {
        const privateKey = body.privateKey;
        return this.keyRepository
            .save({
                id: privateKey.kid,
                tenantId,
                key: privateKey,
            })
            .then(() => privateKey.kid);
    }

    /**
     * Get the public key from the private key.
     * @param privateKey
     * @returns
     */
    private getPubFromPrivateKey(privateKey: JWK_EC_Private): EC_Public {
        const {
            d: _d,
            key_ops: _key_ops,
            ext: _ext,
            ...publicKey
        } = privateKey;
        return publicKey as EC_Public;
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
        const keys = await this.crypto.generateKeyPair();
        const privateKey = keys.privateKey as JWK;
        //add a random key id for reference
        privateKey.kid = v4();
        privateKey.alg = this.crypto.alg;

        //remove exportable and key_ops from the private key
        delete privateKey.ext;
        delete privateKey.key_ops;

        return this.keyRepository
            .save({
                id: privateKey.kid,
                tenantId,
                key: privateKey,
            })
            .then(() => privateKey.kid!);
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
        keyId =
            keyId ||
            (await this.getKid(tenantId).catch(() => this.create(tenantId)));

        return this.keyRepository
            .findOneByOrFail({
                id: keyId,
                tenantId,
            })
            .then((key) => key.key);
    }

    /**
     * Gets one key id for the tenant.
     * If no key exists, it will throw an error.
     * @returns
     */
    getKid(
        tenantId: string,
        type: CertificateType = "signing",
    ): Promise<string> {
        return this.certRepository
            .findOneByOrFail({
                tenantId,
                type,
            })
            .then((cert) => cert.id);
    }

    /**
     * Get the public key
     * @returns
     */
    getPublicKey(type: "jwk", tenantId: string, keyId?: string): Promise<JWK>;
    getPublicKey(
        type: "pem",
        tenantId: string,
        keyId?: string,
    ): Promise<string>;
    async getPublicKey(
        type: "pem" | "jwk",
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
        const privateKeyJWK = (await exportJWK(
            privateKeyInstance,
        )) as JWK_EC_Private;

        // Remove private key components to get only the public key

        const publicKey = this.getPubFromPrivateKey(privateKeyJWK);

        if (type === "pem") {
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
