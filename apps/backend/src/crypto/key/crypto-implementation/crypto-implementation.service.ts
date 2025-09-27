import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ES256 } from "@sd-jwt/crypto-nodejs";
import { CryptoImplementation } from "./crypto-implementation";
import { ED25519 } from "./ed25519";

export type CryptoType = "ES256" | "Ed25519";

@Injectable()
export class CryptoImplementationService {
    private readonly supportedAlgorithms: CryptoType[] = ["ES256", "Ed25519"];
    private readonly cryptoMap: Map<CryptoType, CryptoImplementation>;
    private cachedDefaultAlg: CryptoType | null = null;

    constructor(private configService: ConfigService) {
        // Initialize the map of algorithms to implementations
        this.cryptoMap = new Map([
            ["ES256", ES256],
            ["Ed25519", ED25519],
        ]);
    }

    /**
     * Returns the list of supported algorithm types
     * @returns Array of supported algorithm types
     */
    getSupportedAlgorithms(): CryptoType[] {
        return [...this.supportedAlgorithms];
    }

    /**
     * Return the algorithm that is used for the crypto operations like signing.
     * @returns The configured algorithm type
     */
    getAlg(): CryptoType {
        if (!this.cachedDefaultAlg) {
            this.cachedDefaultAlg = this.configService.get(
                "CRYPTO_ALG",
            ) as CryptoType;

            // Validate the algorithm type
            if (!this.supportedAlgorithms.includes(this.cachedDefaultAlg)) {
                throw new Error(
                    `Unsupported algorithm: ${this.cachedDefaultAlg}`,
                );
            }
        }

        return this.cachedDefaultAlg;
    }

    /**
     * Returns the crypto implementation directly based on the JWK properties.
     * Currently supports Ed25519 and ES256 (P-256 curve).
     * @param jwk - JSON Web Key
     * @returns The appropriate crypto implementation
     * @throws Error if the crypto implementation cannot be determined from the JWK
     */
    getCryptoFromJwk(jwk: JsonWebKey): CryptoImplementation {
        if (!jwk || typeof jwk !== "object") {
            throw new Error("Invalid JWK provided");
        }

        // Check for Ed25519 curve
        if (jwk.crv === "Ed25519") {
            return this.cryptoMap.get("Ed25519")!;
        }

        // Check for ES256 (P-256 curve)
        if (jwk.kty === "EC" && jwk.crv === "P-256") {
            return this.cryptoMap.get("ES256")!;
        }

        throw new Error(
            `Unable to determine crypto implementation from JWK: unsupported key type or curve`,
        );
    }

    /**
     * Returns the crypto implementation based on the provided or configured algorithm.
     * @param alg - Optional algorithm type, defaults to the configured algorithm
     * @returns The appropriate crypto implementation
     * @throws Error if the algorithm is not supported
     */
    getCrypto(alg?: string): CryptoImplementation {
        const algorithmType = alg || this.getAlg();
        const implementation = this.cryptoMap.get(algorithmType as CryptoType);

        if (!implementation) {
            throw new Error(`Unsupported algorithm: ${algorithmType}`);
        }

        return implementation;
    }
}
