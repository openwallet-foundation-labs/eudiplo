import { HttpService } from "@nestjs/axios";
import { JwtPayload, Signer } from "@sd-jwt/types";
import { exportJWK, importSPKI, JWK, JWTHeaderParameters } from "jose";
import { firstValueFrom } from "rxjs";
import { Repository } from "typeorm";
import { v4 } from "uuid";
import {
    CryptoImplementationService,
    CryptoType,
} from "../crypto-implementation/crypto-implementation.service";
import { KeyImportDto } from "../dto/key-import.dto";
import { KeyEntity } from "../entities/keys.entity";
import { KmsAdapter } from "../kms-adapter";

export class VaultKeyService extends KmsAdapter {
    // headers for the vault api
    private readonly headers: { headers: { "X-Vault-Token": string } };

    /**
     * Tracks tenants whose transit mount has been verified during this process lifetime.
     * Avoids repeated mount-creation attempts after a successful retry.
     */
    private readonly verifiedMounts = new Set<string>();

    override get capabilities() {
        return { canImport: false, canCreate: true, canDelete: true };
    }

    constructor(
        private readonly httpService: HttpService,
        private readonly vaultUrl: string,
        vaultToken: string,
        private readonly cryptoService: CryptoImplementationService,
        private readonly keyRepository: Repository<KeyEntity>,
    ) {
        super();
        this.headers = {
            headers: { "X-Vault-Token": vaultToken },
        };
    }

    // ──────────────── mount lifecycle helpers ────────────────

    /**
     * Ensure the Vault transit mount exists for the given tenant.
     * Idempotent — silently succeeds if the mount already exists.
     */
    private async ensureMountExists(tenantId: string): Promise<void> {
        const mountUrl = `${this.vaultUrl}/v1/sys/mounts/${tenantId}`;
        this.logger.log(
            `Ensuring transit mount exists for tenant ${tenantId} at ${mountUrl}`,
        );
        try {
            await firstValueFrom(
                this.httpService.post(
                    mountUrl,
                    { type: "transit" },
                    this.headers,
                ),
            );
            this.logger.log(`Created transit mount for tenant ${tenantId}`);
        } catch (err: any) {
            const status = err?.response?.status;
            // 400 = "path is already in use" — mount exists, which is fine
            if (status === 400) {
                this.logger.debug(
                    `Transit mount for tenant ${tenantId} already exists`,
                );
                this.verifiedMounts.add(tenantId);
                return;
            }
            this.logger.error(
                {
                    url: mountUrl,
                    status,
                    response: err?.response?.data,
                },
                `Failed to create transit mount for tenant ${tenantId}`,
            );
            throw err;
        }
        this.verifiedMounts.add(tenantId);
    }

    /**
     * Execute a Vault operation with automatic mount-initialisation retry.
     *
     * If the operation fails with HTTP 404 (mount or path not found) and we
     * have not already verified the mount for this tenant, the transit mount
     * is created and the operation is retried **exactly once**.
     */
    private async withMountRetry<T>(
        tenantId: string,
        operation: () => Promise<T>,
    ): Promise<T> {
        try {
            return await operation();
        } catch (err: any) {
            if (
                err?.response?.status === 404 &&
                !this.verifiedMounts.has(tenantId)
            ) {
                this.logger.warn(
                    `Vault returned 404 for tenant ${tenantId} — initialising transit mount and retrying`,
                );
                await this.ensureMountExists(tenantId);
                return operation();
            }
            throw err;
        }
    }

    // ──────────────── KmsAdapter interface ────────────────

    /**
     * Create a new transit mount for the tenant and generate the first key.
     * @param tenantId
     */
    async init(tenantId: string) {
        await this.ensureMountExists(tenantId);
        return this.create(tenantId);
    }

    import(_tenantId: string, _body: KeyImportDto): Promise<string> {
        throw new Error("Importing not supported by VaultKeyService");
    }

    /**
     * Get the signer for the key service
     */
    signer(tenantId: string): Promise<Signer> {
        //TODO: validate if this is correct.
        return Promise.resolve((input: string) => this.sign(input, tenantId));
    }

    /**
     * Creates a new keypair in the vault.
     * Automatically creates the transit mount if Vault returns 404.
     * @param tenantId
     * @returns the new key ID
     */
    async create(tenantId: string) {
        return this.withMountRetry(tenantId, async () => {
            const types: Map<CryptoType, string> = new Map();
            types.set("ES256", "ecdsa-p256");
            const id = v4();
            this.logger.debug(
                `Creating key at ${this.vaultUrl}/v1/${tenantId}/keys/${id}`,
            );
            await firstValueFrom(
                this.httpService.post(
                    `${this.vaultUrl}/v1/${tenantId}/keys/${id}`,
                    {
                        exportable: false,
                        type: types.get(this.cryptoService.getAlg()),
                    },
                    this.headers,
                ),
            ).catch((err) => {
                this.logger.error(
                    `Error creating key for tenant ${tenantId}: ${err.message}`,
                );
                throw err;
            });

            // Persist a KeyEntity stub so the key is discoverable by the rest of the system.
            // No private key material is stored — the actual key lives in Vault.
            await this.keyRepository.save({
                id,
                tenantId,
                key: { kid: id, kty: "EC", crv: "P-256" } as JWK,
                kmsProvider: "vault",
            });

            return id;
        });
    }

    /**
     * Get all keys and take the first one.
     * @param tenantId
     * @returns
     */
    getKid(tenantId: string): Promise<string> {
        return this.withMountRetry(tenantId, () =>
            firstValueFrom(
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
                        throw new Error("No keys found");
                    }
                    return (res.data.data.keys as string[])[0];
                },
                (err) => {
                    throw new Error(
                        `Error getting keys for tenant ${tenantId}: ${err.message}`,
                    );
                },
            ),
        );
    }

    /**
     * Gets the public key and converts it to a KeyLike object.
     * @param id
     * @returns
     */
    async getPublicKey(
        type: "pem",
        tenantId: string,
        keyId?: string,
    ): Promise<string>;
    async getPublicKey(
        type: "jwk",
        tenantId: string,
        keyId: string,
    ): Promise<JWK>;
    async getPublicKey(
        type: "jwk" | "pem",
        tenantId: string,
        keyId?: string,
    ): Promise<JWK | string> {
        if (!keyId) {
            keyId = await this.getKid(tenantId);
        }

        return this.withMountRetry(tenantId, () =>
            firstValueFrom(
                this.httpService.get<any>(
                    `${this.vaultUrl}/v1/${tenantId}/keys/${keyId}`,
                    this.headers,
                ),
            ).then(async (res) => {
                return type === "pem"
                    ? (res.data.data.keys["1"].public_key as string)
                    : await this.getJWK(
                          res.data.data.keys["1"].public_key,
                          tenantId,
                      );
            }),
        );
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
        return this.withMountRetry(tenantId, () =>
            firstValueFrom(
                this.httpService.post(
                    `${this.vaultUrl}/v1/${tenantId}/sign/${keyId}`,
                    {
                        input: Buffer.from(value).toString("base64"),
                        marshaling_algorithm: "jws",
                    },
                    this.headers,
                ),
            ).then((res) => res.data.data.signature.split(":")[2]),
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
            "base64url",
        );
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
            "base64url",
        );
        const signingInput = `${encodedHeader}.${encodedPayload}`;

        // Request to Vault for signing
        try {
            const signature = await this.sign(signingInput, tenantId, keyId);
            return `${encodedHeader}.${encodedPayload}.${signature}`;
        } catch (error) {
            this.logger.error("Error signing JWT with Vault:");
            throw error;
        }
    }

    async deleteKey(tenantId: string, keyId: string): Promise<void> {
        await this.withMountRetry(tenantId, async () => {
            // Vault transit keys require deletion_allowed=true before they can be deleted
            await firstValueFrom(
                this.httpService.post(
                    `${this.vaultUrl}/v1/${tenantId}/keys/${keyId}/config`,
                    { deletion_allowed: true },
                    this.headers,
                ),
            );
            await firstValueFrom(
                this.httpService.delete(
                    `${this.vaultUrl}/v1/${tenantId}/keys/${keyId}`,
                    this.headers,
                ),
            );
        });
        // Remove the KeyEntity stub from the database
        await this.keyRepository.delete({ tenantId, id: keyId });
    }
}
