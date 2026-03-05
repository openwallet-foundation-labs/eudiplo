import {
    CreateKeyCommand,
    GetPublicKeyCommand,
    KeySpec,
    KeyUsageType,
    KMSClient,
    ScheduleKeyDeletionCommand,
    SignCommand,
    SigningAlgorithmSpec,
} from "@aws-sdk/client-kms";
import { Signer } from "@sd-jwt/types";
import { exportJWK, importSPKI, JWK } from "jose";
import { Repository } from "typeorm";
import { v4 } from "uuid";
import {
    CryptoImplementationService,
    CryptoType,
} from "../crypto-implementation/crypto-implementation.service";
import { KeyImportDto } from "../dto/key-import.dto";
import { KeyEntity } from "../entities/keys.entity";
import { KmsAdapter, KmsProviderCapabilities } from "../kms-adapter";

/**
 * Maps internal algorithm types to AWS KMS signing algorithms.
 */
const ALG_TO_KMS_SIGNING: Partial<Record<CryptoType, SigningAlgorithmSpec>> = {
    ES256: SigningAlgorithmSpec.ECDSA_SHA_256,
};

/**
 * Maps internal algorithm types to AWS KMS key specs.
 */
const ALG_TO_KEY_SPEC: Partial<Record<CryptoType, KeySpec>> = {
    ES256: KeySpec.ECC_NIST_P256,
};

/**
 * Algorithms supported by the AWS KMS adapter.
 */
const SUPPORTED_ALGORITHMS: CryptoType[] = ["ES256"];

/**
 * AWS KMS-backed key management adapter.
 * Key material is stored and managed by AWS KMS; only key IDs are stored locally.
 */
export class AwsKmsKeyService extends KmsAdapter {
    private readonly kmsClient: KMSClient;

    override get capabilities(): KmsProviderCapabilities {
        // AWS KMS doesn't support importing EC keys via the standard import flow
        return { canImport: false, canCreate: true, canDelete: true };
    }

    constructor(
        private readonly cryptoService: CryptoImplementationService,
        private readonly keyRepository: Repository<KeyEntity>,
        region: string,
        accessKeyId?: string,
        secretAccessKey?: string,
    ) {
        super();

        // Validate that the configured algorithm is supported by AWS KMS
        const alg = cryptoService.getAlg();
        if (!SUPPORTED_ALGORITHMS.includes(alg)) {
            throw new Error(
                `AWS KMS adapter does not support algorithm "${alg}". ` +
                    `Supported algorithms: ${SUPPORTED_ALGORITHMS.join(", ")}.`,
            );
        }

        // Configure the KMS client
        // If credentials are not provided, the SDK will use the default credential chain
        const clientConfig: ConstructorParameters<typeof KMSClient>[0] = {
            region,
        };

        if (accessKeyId && secretAccessKey) {
            clientConfig.credentials = {
                accessKeyId,
                secretAccessKey,
            };
        }

        this.kmsClient = new KMSClient(clientConfig);
    }

    /**
     * Initialize the KMS for a tenant by creating the first key.
     */
    async init(tenantId: string): Promise<string> {
        return this.getKid(tenantId).catch(() => this.create(tenantId));
    }

    /**
     * Create a new asymmetric signing key in AWS KMS.
     * The key ID from AWS is stored locally for reference.
     */
    async create(tenantId: string): Promise<string> {
        const alg = this.cryptoService.getAlg();
        const keySpec = ALG_TO_KEY_SPEC[alg];

        if (!keySpec) {
            throw new Error(`Unsupported algorithm for AWS KMS: ${alg}`);
        }

        const localId = v4();
        const command = new CreateKeyCommand({
            KeySpec: keySpec,
            KeyUsage: KeyUsageType.SIGN_VERIFY,
            Description: `EUDIPLO key for tenant ${tenantId} (local ID: ${localId})`,
            Tags: [
                { TagKey: "TenantId", TagValue: tenantId },
                { TagKey: "LocalKeyId", TagValue: localId },
                { TagKey: "ManagedBy", TagValue: "eudiplo" },
            ],
        });

        const response = await this.kmsClient.send(command);
        const awsKeyId = response.KeyMetadata?.KeyId;

        if (!awsKeyId) {
            throw new Error(
                "Failed to create key in AWS KMS: no KeyId returned",
            );
        }

        this.logger.log(
            `Created AWS KMS key ${awsKeyId} for tenant ${tenantId}`,
        );

        // Store a reference to the AWS key in the local database
        // The externalKeyId column stores the AWS KMS key ID separately from the JWK
        await this.keyRepository.save({
            id: localId,
            tenantId,
            key: {
                kid: localId,
                kty: "EC",
                crv: "P-256",
            } as JWK,
            kmsProvider: "aws-kms",
            externalKeyId: awsKeyId,
        });

        return localId;
    }

    /**
     * Import is not supported for AWS KMS EC keys.
     */
    import(_tenantId: string, _body: KeyImportDto): Promise<string> {
        throw new Error(
            "Importing EC keys is not supported by AWS KMS adapter. Use create() instead.",
        );
    }

    /**
     * Get a signer function for the specified tenant/key.
     */
    async signer(tenantId: string, keyId?: string): Promise<Signer> {
        return (input: string) => this.sign(input, tenantId, keyId);
    }

    /**
     * Get the first available key ID for this tenant.
     */
    async getKid(tenantId: string): Promise<string> {
        const entity = await this.keyRepository.findOneByOrFail({
            tenantId,
            kmsProvider: "aws-kms",
        });
        return entity.id;
    }

    /**
     * Get the public key from AWS KMS in the requested format.
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
        const keyEntity = await this.getKeyEntity(tenantId, keyId);
        const awsKeyId = keyEntity.externalKeyId;

        if (!awsKeyId) {
            throw new Error(
                `Key ${keyEntity.id} is missing externalKeyId for AWS KMS`,
            );
        }

        const command = new GetPublicKeyCommand({
            KeyId: awsKeyId,
        });

        const response = await this.kmsClient.send(command);

        if (!response.PublicKey) {
            throw new Error("Failed to retrieve public key from AWS KMS");
        }

        // AWS returns the public key in DER format, convert to PEM
        const derBuffer = response.PublicKey;
        const pemKey = this.derToPem(derBuffer, "PUBLIC KEY");

        if (type === "pem") {
            return pemKey;
        }

        // Convert PEM to JWK
        const alg = this.cryptoService.getAlg();
        const cryptoKey = await importSPKI(pemKey, alg);
        const jwk = await exportJWK(cryptoKey);
        jwk.kid = keyEntity.id;
        jwk.alg = alg;

        return jwk;
    }

    /**
     * Sign data using AWS KMS.
     */
    async sign(
        value: string,
        tenantId: string,
        keyId?: string,
    ): Promise<string> {
        const keyEntity = await this.getKeyEntity(tenantId, keyId);
        const awsKeyId = keyEntity.externalKeyId;

        if (!awsKeyId) {
            throw new Error(
                `Key ${keyEntity.id} is missing externalKeyId for AWS KMS`,
            );
        }

        const alg = this.cryptoService.getAlg();
        const signingAlgorithm = ALG_TO_KMS_SIGNING[alg];

        const command = new SignCommand({
            KeyId: awsKeyId,
            Message: Buffer.from(value),
            MessageType: "RAW",
            SigningAlgorithm: signingAlgorithm,
        });

        const response = await this.kmsClient.send(command);

        if (!response.Signature) {
            throw new Error(
                "Failed to sign with AWS KMS: no signature returned",
            );
        }

        // AWS KMS returns DER-encoded ECDSA signature, convert to JWS format (r || s)
        const signature = this.derToJws(response.Signature);
        return signature;
    }

    /**
     * Delete a key from AWS KMS (schedules for deletion).
     */
    async deleteKey(tenantId: string, keyId: string): Promise<void> {
        const keyEntity = await this.keyRepository.findOneByOrFail({
            tenantId,
            id: keyId,
        });
        const awsKeyId = keyEntity.externalKeyId;

        if (!awsKeyId) {
            throw new Error(
                `Key ${keyId} is missing externalKeyId for AWS KMS`,
            );
        }

        // Schedule key deletion in AWS KMS (minimum 7 days pending period)
        const command = new ScheduleKeyDeletionCommand({
            KeyId: awsKeyId,
            PendingWindowInDays: 7,
        });

        await this.kmsClient.send(command);
        this.logger.log(
            `Scheduled deletion of AWS KMS key ${awsKeyId} for tenant ${tenantId}`,
        );

        // Remove the local reference
        await this.keyRepository.delete({ tenantId, id: keyId });
    }

    /**
     * Get the key entity for a tenant, optionally by key ID.
     */
    private async getKeyEntity(
        tenantId: string,
        keyId?: string,
    ): Promise<KeyEntity> {
        if (keyId) {
            return this.keyRepository.findOneByOrFail({
                tenantId,
                id: keyId,
                kmsProvider: "aws-kms",
            });
        }
        return this.keyRepository.findOneByOrFail({
            tenantId,
            kmsProvider: "aws-kms",
        });
    }

    /**
     * Convert DER-encoded buffer to PEM format.
     */
    private derToPem(der: Uint8Array, label: string): string {
        const base64 = Buffer.from(der).toString("base64");
        const lines: string[] = [];
        for (let i = 0; i < base64.length; i += 64) {
            lines.push(base64.slice(i, i + 64));
        }
        return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
    }

    /**
     * Convert DER-encoded ECDSA signature to JWS format (r || s, base64url encoded).
     * ECDSA signatures in DER format are: SEQUENCE { INTEGER r, INTEGER s }
     */
    private derToJws(derSignature: Uint8Array): string {
        const der = Buffer.from(derSignature);

        // Parse DER structure
        if (der[0] !== 0x30) {
            throw new Error("Invalid DER signature: expected SEQUENCE");
        }

        // For P-256 ECDSA signatures, the SEQUENCE length is encoded in short form
        // and fits in a single byte. Reject long-form lengths to avoid misparsing.
        if (der[1] & 0x80) {
            throw new Error(
                "Invalid DER signature: unsupported long-form SEQUENCE length",
            );
        }

        let offset = 2; // Skip SEQUENCE tag and (short-form) length
        // Parse r
        if (der[offset] !== 0x02) {
            throw new Error("Invalid DER signature: expected INTEGER for r");
        }
        offset++;
        const rLength = der[offset];
        offset++;
        let r = der.subarray(offset, offset + rLength);
        offset += rLength;

        // Parse s
        if (der[offset] !== 0x02) {
            throw new Error("Invalid DER signature: expected INTEGER for s");
        }
        offset++;
        const sLength = der[offset];
        offset++;
        let s = der.subarray(offset, offset + sLength);

        // Remove leading zeros (DER integers are signed, may have padding)
        if (r[0] === 0x00 && r.length > 32) {
            r = r.subarray(1);
        }
        if (s[0] === 0x00 && s.length > 32) {
            s = s.subarray(1);
        }

        // Pad to 32 bytes for P-256
        const componentLength = 32;
        const rPadded = Buffer.alloc(componentLength);
        const sPadded = Buffer.alloc(componentLength);
        r.copy(rPadded, componentLength - r.length);
        s.copy(sPadded, componentLength - s.length);

        // Concatenate r || s and base64url encode
        const jwsSignature = Buffer.concat([rPadded, sPadded]);
        return jwsSignature.toString("base64url");
    }
}
