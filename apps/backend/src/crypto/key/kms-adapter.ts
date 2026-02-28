import { Logger } from "@nestjs/common";
import { Signer } from "@sd-jwt/types";
import { JWK, JWSHeaderParameters, JWTPayload } from "jose";
import { KeyImportDto } from "./dto/key-import.dto";

/**
 * Describes what operations a KMS provider supports.
 * Returned by the providers endpoint so the UI can adapt accordingly.
 */
export interface KmsProviderCapabilities {
    canImport: boolean;
    canCreate: boolean;
    canDelete: boolean;
}

/**
 * Abstract base class for KMS adapters.
 *
 * Each KMS adapter (DB, Vault, …) implements **only** the cryptographic and
 * storage operations specific to that backend.  DB queries for routing,
 * config‐import and metadata updates live in the concrete {@link KeyService}
 * facade — not here.
 */
export abstract class KmsAdapter {
    protected readonly logger = new Logger(this.constructor.name);

    /**
     * Capabilities of this KMS provider.
     * Override in subclasses to restrict operations (e.g. Vault cannot import).
     */
    get capabilities(): KmsProviderCapabilities {
        return { canImport: true, canCreate: true, canDelete: true };
    }

    /**
     * Initialise the KMS for a tenant (e.g. create a Vault transit mount).
     */
    abstract init(tenantId: string): Promise<string>;

    /**
     * Generate a new key pair and persist it in this KMS.
     * @returns the key ID
     */
    abstract create(tenantId: string): Promise<string>;

    /**
     * Import existing key material into this KMS.
     * @returns the key ID
     */
    abstract import(tenantId: string, body: KeyImportDto): Promise<string>;

    /** Get a signer callback for the given key. */
    abstract signer(tenantId: string, keyId?: string): Promise<Signer>;

    /** Get the first available key ID for this tenant. */
    abstract getKid(tenantId: string, usage?: KeyUsage): Promise<string>;

    /** Get the public key in JWK format. */
    abstract getPublicKey(
        type: "jwk",
        tenantId: string,
        keyId?: string,
    ): Promise<JWK>;
    /** Get the public key in PEM format. */
    abstract getPublicKey(
        type: "pem",
        tenantId: string,
        keyId?: string,
    ): Promise<string>;
    abstract getPublicKey(
        type: "pem" | "jwk",
        tenantId: string,
        keyId?: string,
    ): Promise<JWK | string>;

    /** Sign a JWT. */
    abstract signJWT(
        payload: JWTPayload,
        header: JWSHeaderParameters,
        tenantId: string,
        keyId?: string,
    ): Promise<string>;

    /** Delete a key from this KMS. */
    abstract deleteKey(tenantId: string, keyId: string): Promise<void>;
}
