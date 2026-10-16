import { BadRequestException, Injectable } from "@nestjs/common";
import { importJWK, type JWK } from "jose";
import {
    providerAlgRefusal,
    signingAlgForJwk,
    signingAlgSpec,
} from "../../crypto/key/domain/signing-algs.js";
import type {
    KmsAdapter,
    KmsSigningAlg,
} from "../../crypto/key/kms/kms-adapter.js";
import { KmsProviderRegistry } from "../../crypto/key/kms/kms-provider.registry.js";
import { keyChainProviderKeys } from "./key-chain-document.js";

interface ExternalKeySource {
    provider: string;
    externalKeyId: string;
    publicJwk: JWK;
    activeExternalKeyId?: string;
    activePublicJwk?: JWK;
}

@Injectable()
export class ConfigKmsReferenceService {
    constructor(private readonly kmsRegistry: KmsProviderRegistry) {}

    /**
     * The first key of a key chain document whose algorithm its KMS provider
     * does not offer (`algorithms` in kms.json), or undefined. Keys that are
     * not EC keys on a supported curve, and unknown providers, are left to
     * the checks that report those.
     */
    unsupportedAlgorithm(
        tenantId: string,
        spec: Record<string, any>,
    ): { path: string; message: string } | undefined {
        const { provider, keys } = keyChainProviderKeys(spec);
        if (keys.length === 0) return undefined;
        let adapter: KmsAdapter;
        try {
            adapter = this.kmsRegistry.resolve(provider, tenantId);
        } catch {
            return undefined;
        }
        for (const { path, jwk } of keys) {
            let alg: KmsSigningAlg;
            try {
                alg = signingAlgForJwk(jwk as JWK);
            } catch {
                continue;
            }
            const message = providerAlgRefusal(
                adapter.providerId,
                adapter.capabilities.supportedAlgs,
                alg,
                `the key in ${path.replace("/spec/", "").replaceAll("/", ".")}`,
            );
            if (message) return { path, message };
        }
        return undefined;
    }

    async verify(tenantId: string, source: ExternalKeySource): Promise<void> {
        await this.verifyOne(
            tenantId,
            source.provider,
            source.externalKeyId,
            source.publicJwk,
        );
        if (source.activeExternalKeyId) {
            if (!source.activePublicJwk) {
                throw new BadRequestException(
                    "activePublicJwk is required with activeExternalKeyId",
                );
            }
            await this.verifyOne(
                tenantId,
                source.provider,
                source.activeExternalKeyId,
                source.activePublicJwk,
            );
        }
    }

    private async verifyOne(
        tenantId: string,
        provider: string,
        externalKeyId: string,
        publicJwk: JWK,
    ): Promise<void> {
        const adapter = this.kmsRegistry.resolve(provider, tenantId);
        let alg: KmsSigningAlg;
        try {
            alg = signingAlgForJwk(publicJwk);
        } catch (error) {
            throw new BadRequestException(
                `External KMS key '${externalKeyId}': ${error instanceof Error ? error.message : String(error)}`,
            );
        }
        const challenge = globalThis.crypto.getRandomValues(new Uint8Array(32));
        const signature = await adapter.sign(
            { externalKeyId, publicJwk, alg },
            challenge,
        );
        const publicKey = await importJWK(publicJwk, alg);
        if (publicKey instanceof Uint8Array) {
            throw new BadRequestException(
                "External KMS public JWK must be asymmetric",
            );
        }
        const valid = await globalThis.crypto.subtle.verify(
            { name: "ECDSA", hash: signingAlgSpec(alg).hash },
            publicKey,
            this.toArrayBuffer(signature),
            this.toArrayBuffer(challenge),
        );
        if (!valid) {
            throw new BadRequestException(
                `External KMS key '${externalKeyId}' does not match its public JWK`,
            );
        }
    }

    private toArrayBuffer(value: Uint8Array): ArrayBuffer {
        const output = new ArrayBuffer(value.byteLength);
        new Uint8Array(output).set(value);
        return output;
    }
}
