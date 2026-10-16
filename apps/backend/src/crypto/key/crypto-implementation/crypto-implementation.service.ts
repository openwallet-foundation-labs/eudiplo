import { Injectable } from "@nestjs/common";
import { jwaSignatureAlgorithmToFullySpecifiedCoseAlgorithm } from "@openid4vc/oauth2";
import { ES256, ES384, ES512 } from "@owf/crypto";
import { CredentialFormat } from "../../../issuer/configuration/credentials/entities/credential.entity.js";
import {
    KMS_SIGNING_ALGS,
    type KmsSigningAlg,
    SIGNING_ALG_SPECS,
    signingAlgForCurve,
} from "../domain/signing-algs.js";
import { CryptoImplementation } from "./crypto-implementation.js";

/**
 * JOSE algorithm names used for SD-JWT VC
 */
export type JoseAlgorithm = KmsSigningAlg;

/**
 * COSE algorithm identifiers used for mDOC (ISO 18013-5)
 * Uses RFC 9864 fully-specified algorithm identifiers
 * @see https://www.rfc-editor.org/rfc/rfc9864.html
 */
export type CoseAlgorithm = number;

const CRYPTO_IMPLEMENTATIONS: Record<KmsSigningAlg, CryptoImplementation> = {
    ES256,
    ES384,
    ES512,
};

@Injectable()
export class CryptoImplementationService {
    /**
     * Algorithms EUDIPLO accepts in signatures of wallets and other issuers
     * (proofs, key binding JWTs, presented credentials), in the identifiers
     * of the credential format.
     * - For SD-JWT VC: JOSE algorithm names (ES256, ES384, ES512)
     * - For mDOC: classic and fully-specified COSE algorithm identifiers
     * @param credentialFormat The credential format
     * @returns Array of algorithm identifiers appropriate for the format
     */
    getAlgs(
        credentialFormat: CredentialFormat,
    ): (JoseAlgorithm | CoseAlgorithm)[] {
        return this.toFormatAlgs(credentialFormat, KMS_SIGNING_ALGS);
    }

    /**
     * The identifiers of one signing algorithm in a credential format, for
     * `credential_signing_alg_values_supported` of a credential signed with a
     * key of that algorithm.
     */
    getSigningAlgs(
        credentialFormat: CredentialFormat,
        alg: KmsSigningAlg,
    ): (JoseAlgorithm | CoseAlgorithm)[] {
        return this.toFormatAlgs(credentialFormat, [alg]);
    }

    private toFormatAlgs(
        credentialFormat: CredentialFormat,
        joseAlgs: readonly JoseAlgorithm[],
    ): (JoseAlgorithm | CoseAlgorithm)[] {
        if (credentialFormat === CredentialFormat.MSO_MDOC) {
            const coseAlgs = new Set<number>();

            for (const alg of joseAlgs) {
                // Include classic COSE alg IDs for compatibility with generic identifiers.
                coseAlgs.add(SIGNING_ALG_SPECS[alg].coseAlg);

                // Also include RFC 9864 fully-specified identifiers.
                const fullySpecifiedAlg =
                    jwaSignatureAlgorithmToFullySpecifiedCoseAlgorithm(alg);
                if (fullySpecifiedAlg !== undefined) {
                    coseAlgs.add(fullySpecifiedAlg);
                }
            }

            return Array.from(coseAlgs);
        }

        // SD-JWT VC and the default use JOSE algorithms
        return [...joseAlgs];
    }

    /**
     * Returns the crypto implementation directly based on the JWK properties.
     * Supports EC keys on P-256 (ES256), P-384 (ES384) and P-521 (ES512).
     * @param jwk - JSON Web Key
     * @returns The appropriate crypto implementation
     * @throws Error if the crypto implementation cannot be determined from the JWK
     */
    getCryptoFromJwk(jwk: JsonWebKey): CryptoImplementation {
        if (!jwk || typeof jwk !== "object") {
            throw new Error("Invalid JWK provided");
        }

        const alg = jwk.kty === "EC" ? signingAlgForCurve(jwk.crv) : undefined;
        if (alg) {
            return CRYPTO_IMPLEMENTATIONS[alg];
        }

        throw new Error(
            `Unable to determine crypto implementation from JWK: unsupported key type or curve`,
        );
    }
}
