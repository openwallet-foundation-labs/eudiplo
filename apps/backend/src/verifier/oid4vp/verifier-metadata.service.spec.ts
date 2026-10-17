import { describe, expect, it, vi } from "vitest";
import { CryptoImplementationService } from "../../crypto/key/crypto-implementation/crypto-implementation.service.js";
import { KeyUsageType } from "../../crypto/key/types/key-usage-type.js";
import { VerifierMetadataService } from "./verifier-metadata.service.js";

describe("VerifierMetadataService", () => {
    it("publishes the access keys for signatures and the tenant key for response encryption", async () => {
        const keyChains = {
            getPublicKeysByUsageTypes: vi.fn().mockResolvedValue([
                { kty: "EC", kid: "access-a" },
                { kty: "EC", kid: "access-b", use: "sig" },
            ]),
        };
        const encryption = {
            getEncryptionPublicKey: vi.fn().mockResolvedValue({
                kty: "EC",
                kid: "encryption",
                use: "enc",
                alg: "ECDH-ES",
            }),
        };
        const service = new VerifierMetadataService(
            new CryptoImplementationService(),
            keyChains as never,
            encryption as never,
        );

        const metadata = await service.credentialVerifierMetadata("tenant");

        expect(keyChains.getPublicKeysByUsageTypes).toHaveBeenCalledWith(
            "tenant",
            [KeyUsageType.Access],
        );
        expect(metadata.jwks).toEqual({
            keys: [
                { kty: "EC", kid: "access-a", use: "sig" },
                { kty: "EC", kid: "access-b", use: "sig" },
                { kty: "EC", kid: "encryption", use: "enc", alg: "ECDH-ES" },
            ],
        });
        expect(metadata.vp_formats_supported).toEqual({
            mso_mdoc: {
                issuerauth_alg_values: [-7, -35, -36],
                deviceauth_alg_values: [-7, -35, -36, -9, -51, -52],
            },
            "dc+sd-jwt": {
                "kb-jwt_alg_values": ["ES256", "ES384", "ES512"],
                "sd-jwt_alg_values": ["ES256", "ES384", "ES512"],
            },
        });
        expect(metadata.encrypted_response_enc_values_supported).toEqual([
            "A128GCM",
            "A256GCM",
        ]);
    });
});
