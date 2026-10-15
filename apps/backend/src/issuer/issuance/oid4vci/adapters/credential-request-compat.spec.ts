import { describe, expect, it } from "vitest";
import {
    addLegacyCredentialResponseEncryptionAlg,
    dropUnsupportedCredentialResponseCompression,
} from "./credential-request-compat.js";

describe("addLegacyCredentialResponseEncryptionAlg", () => {
    it("adds the legacy sibling alg without mutating the wallet request", () => {
        const request = {
            credential_configuration_id: "pid",
            credential_response_encryption: {
                jwk: { kty: "EC", alg: "ECDH-ES" },
                enc: "A256GCM",
            },
        };

        const normalized = addLegacyCredentialResponseEncryptionAlg(request);

        expect(normalized).toEqual({
            ...request,
            credential_response_encryption: {
                ...request.credential_response_encryption,
                alg: "ECDH-ES",
            },
        });
        expect(request.credential_response_encryption).not.toHaveProperty(
            "alg",
        );
    });

    it("preserves an explicit legacy alg and requests without response encryption", () => {
        const legacyRequest = {
            credential_response_encryption: {
                jwk: { kty: "EC", alg: "ECDH-ES" },
                alg: "ECDH-ES+A256KW",
                enc: "A256GCM",
            },
        };
        expect(addLegacyCredentialResponseEncryptionAlg(legacyRequest)).toBe(
            legacyRequest,
        );

        const plainRequest = { credential_configuration_id: "pid" };
        expect(addLegacyCredentialResponseEncryptionAlg(plainRequest)).toBe(
            plainRequest,
        );
    });
});

describe("dropUnsupportedCredentialResponseCompression", () => {
    const request = {
        credential_configuration_id: "pid",
        credential_response_encryption: {
            jwk: { kty: "EC", alg: "ECDH-ES" },
            enc: "A256GCM",
            zip: "DEF",
        },
    };

    it("drops a zip the issuer does not advertise without mutating the wallet request", () => {
        const normalized = dropUnsupportedCredentialResponseCompression(
            request,
            undefined,
        );

        expect(normalized).toEqual({
            credential_configuration_id: "pid",
            credential_response_encryption: {
                jwk: { kty: "EC", alg: "ECDH-ES" },
                enc: "A256GCM",
            },
        });
        expect(request.credential_response_encryption.zip).toBe("DEF");
        expect(
            dropUnsupportedCredentialResponseCompression(request, ["XYZ"])
                .credential_response_encryption,
        ).not.toHaveProperty("zip");
    });

    it("leaves a zip that is not a string for the parser to refuse", () => {
        const invalidZip = {
            credential_response_encryption: {
                jwk: { kty: "EC", alg: "ECDH-ES" },
                enc: "A256GCM",
                zip: 1,
            },
        };

        expect(
            dropUnsupportedCredentialResponseCompression(invalidZip, ["DEF"]),
        ).toBe(invalidZip);
    });

    it("keeps an advertised zip and requests without zip", () => {
        expect(
            dropUnsupportedCredentialResponseCompression(request, ["DEF"]),
        ).toBe(request);

        const withoutZip = {
            credential_response_encryption: {
                jwk: { kty: "EC", alg: "ECDH-ES" },
                enc: "A256GCM",
            },
        };
        expect(
            dropUnsupportedCredentialResponseCompression(withoutZip, undefined),
        ).toBe(withoutZip);

        const plainRequest = { credential_configuration_id: "pid" };
        expect(
            dropUnsupportedCredentialResponseCompression(
                plainRequest,
                undefined,
            ),
        ).toBe(plainRequest);
    });
});
