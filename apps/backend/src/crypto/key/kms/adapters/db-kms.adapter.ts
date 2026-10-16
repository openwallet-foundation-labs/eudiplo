import { exportJWK, generateKeyPair, importJWK, type JWK } from "jose";
import {
    assertKmsSigningAlg,
    KMS_SIGNING_ALGS,
    type KmsAlgorithmPolicy,
    resolveAlgorithmCapabilities,
    signingAlgForJwk,
    signingAlgSpec,
} from "../../domain/signing-algs.js";
import type { KmsProviderType } from "../../dto/kms-config.dto.js";
import type {
    KmsAdapter,
    KmsAdapterCapabilities,
    KmsHealthResult,
    KmsKeyMaterial,
    KmsKeyRef,
    KmsSigningAlg,
} from "../kms-adapter.js";

/**
 * Database-backed KMS adapter.
 *
 * Key material is generated locally via WebCrypto and the private JWK
 * is returned in {@link KmsKeyRef.privateJwk} so it can be persisted in
 * the encrypted `KeyChainEntity.activeJwk` column. Signing imports the
 * JWK on demand and calls `crypto.subtle.sign`.
 *
 * This adapter preserves the historical pre-abstraction behavior so
 * existing tenants are unaffected by the KMS refactor.
 */
export class DbKmsAdapter implements KmsAdapter {
    readonly type: KmsProviderType = "db";
    readonly capabilities: KmsAdapterCapabilities;

    constructor(
        readonly providerId: string,
        algorithms?: KmsAlgorithmPolicy,
    ) {
        this.capabilities = {
            canCreate: true,
            canImport: true,
            canDelete: true,
            ...resolveAlgorithmCapabilities(KMS_SIGNING_ALGS, algorithms),
        };
    }

    async generateKey(opts: {
        kid: string;
        alg?: KmsSigningAlg;
    }): Promise<KmsKeyMaterial> {
        // Not limited to capabilities.supportedAlgs: rotation keeps the
        // algorithm of an existing key chain.
        const alg = opts.alg ?? this.capabilities.defaultAlg;
        assertKmsSigningAlg(alg, `DbKmsAdapter[${this.providerId}]`);
        const keyPair = await generateKeyPair(alg, { extractable: true });
        const privateJwk = await exportJWK(keyPair.privateKey);
        const publicJwk = await exportJWK(keyPair.publicKey);
        privateJwk.kid = opts.kid;
        privateJwk.alg = alg;
        publicJwk.kid = opts.kid;
        publicJwk.alg = alg;
        return { ref: { privateJwk, publicJwk, alg } };
    }

    async importKey(opts: {
        kid: string;
        privateJwk: JWK;
        alg?: KmsSigningAlg;
    }): Promise<KmsKeyMaterial> {
        const alg = signingAlgForJwk(opts.privateJwk);
        if (opts.alg && opts.alg !== alg) {
            throw new Error(
                `DbKmsAdapter[${this.providerId}]: key on ${String(opts.privateJwk.crv)} cannot be used with ${opts.alg}`,
            );
        }
        this.assertSupported(alg);
        const privateJwk: JWK = { ...opts.privateJwk };
        privateJwk.kid = privateJwk.kid || opts.kid;
        privateJwk.alg = alg;
        const publicJwk = stripPrivateComponents(privateJwk);
        return { ref: { privateJwk, publicJwk, alg } };
    }

    async sign(
        ref: KmsKeyRef,
        data: Uint8Array,
        alg?: KmsSigningAlg,
    ): Promise<Uint8Array> {
        if (!ref.privateJwk) {
            throw new Error(
                `DbKmsAdapter[${this.providerId}]: missing privateJwk in key reference`,
            );
        }
        const signAlg = alg ?? ref.alg;
        assertKmsSigningAlg(signAlg, `DbKmsAdapter[${this.providerId}]`);
        const privateKey = (await importJWK(
            ref.privateJwk,
            signAlg,
        )) as CryptoKey;
        const signature = await globalThis.crypto.subtle.sign(
            { name: "ECDSA", hash: signingAlgSpec(signAlg).hash },
            privateKey,
            data as BufferSource,
        );
        return new Uint8Array(signature);
    }

    async deleteKey(_ref: KmsKeyRef): Promise<void> {
        // No-op: lifecycle is owned by the KeyChainEntity row.
    }

    async health(): Promise<KmsHealthResult> {
        return { ok: true, latencyMs: 0 };
    }

    private assertSupported(alg: KmsSigningAlg): void {
        if (!this.capabilities.supportedAlgs.includes(alg)) {
            throw new Error(
                `DbKmsAdapter[${this.providerId}]: unsupported alg '${alg}'`,
            );
        }
    }
}

function stripPrivateComponents(jwk: JWK): JWK {
    const { d, p, q, dp, dq, qi, k, ...publicJwk } = jwk as Record<
        string,
        unknown
    >;
    return publicJwk;
}
