import { BadRequestException, Injectable } from "@nestjs/common";
import { importJWK, type JWK } from "jose";
import type { KmsSigningAlg } from "../../crypto/key/kms/kms-adapter.js";
import { KmsProviderRegistry } from "../../crypto/key/kms/kms-provider.registry.js";
import {
    signingAlgForJwk,
    signingAlgSpec,
} from "../../crypto/key/domain/signing-algs.js";

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
