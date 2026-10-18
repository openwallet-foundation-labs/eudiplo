import { generateKeyPairSync, sign } from "node:crypto";
import {
    compactVerify,
    decodeProtectedHeader,
    exportJWK,
    importJWK,
    type JWK,
} from "jose";
import { describe, expect, it, vi } from "vitest";
import { KeyUsageType } from "../../crypto/key/types/key-usage-type.js";
import type { EntityConfigurationContent } from "../ports/federation-entity-provider.js";
import { LocalFederationEntityProvider } from "./local-federation-entity-provider.js";

const ENTITY_ID = "https://issuer.example.org/issuers/tenant";
const NOW = new Date("2026-10-17T12:00:00Z");

async function federationKeyChain() {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
        namedCurve: "P-256",
    });
    const publicJwk: JWK = {
        ...(await exportJWK(publicKey)),
        kid: "fed-active",
        alg: "ES256",
    };
    const previous: JWK = { ...publicJwk, kid: "fed-previous" };
    const keyChain = {
        id: "fed",
        activeJwk: { ...publicJwk, d: "private" },
        getPublicKeys: () => [publicJwk, previous],
    };
    const keys = {
        findByUsageType: vi.fn().mockResolvedValue(keyChain),
        getSigningAlg: vi.fn().mockResolvedValue("ES256"),
        signBytes: vi.fn(async (data: Uint8Array) =>
            sign("sha256", data, {
                key: privateKey,
                dsaEncoding: "ieee-p1363",
            }),
        ),
    };
    return { keys, publicJwk };
}

const b64 = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

function content(
    overrides: Partial<EntityConfigurationContent> = {},
): EntityConfigurationContent {
    return {
        authorityHints: ["https://ta.example.org"],
        metadata: {
            federation_entity: { organization_name: "Example" },
            openid_credential_issuer: {
                credential_issuer: ENTITY_ID,
                jwks: { keys: [{ kty: "EC", kid: "credential-key" }] },
            },
        },
        trustMarks: [],
        lifetimeSeconds: 3600,
        ...overrides,
    };
}

describe("LocalFederationEntityProvider", () => {
    it("signs the entity configuration with the federation key chain", async () => {
        const { keys, publicJwk } = await federationKeyChain();
        const provider = new LocalFederationEntityProvider(
            keys as never,
            () => NOW,
        );

        const jwt = await provider.getEntityConfiguration({
            tenantId: "tenant",
            entityId: ENTITY_ID,
            keyChainId: "fed",
            content: async () => content(),
        });

        expect(keys.findByUsageType).toHaveBeenCalledWith(
            "tenant",
            KeyUsageType.Federation,
            "fed",
        );
        expect(decodeProtectedHeader(jwt)).toEqual({
            typ: "entity-statement+jwt",
            alg: "ES256",
            kid: "fed-active",
        });
        const { payload } = await compactVerify(
            jwt,
            await importJWK(publicJwk, "ES256"),
        );
        const claims = JSON.parse(new TextDecoder().decode(payload));
        const iat = Math.floor(NOW.getTime() / 1000);
        expect(claims).toEqual({
            iss: ENTITY_ID,
            sub: ENTITY_ID,
            iat,
            exp: iat + 3600,
            jwks: {
                keys: [publicJwk, { ...publicJwk, kid: "fed-previous" }],
            },
            authority_hints: ["https://ta.example.org"],
            metadata: content().metadata,
        });
        // The federation keys stay apart from the protocol keys.
        expect(claims.jwks.keys.map((key: JWK) => key.kid)).not.toContain(
            "credential-key",
        );
        expect(JSON.stringify(claims)).not.toContain("private");
    });

    it("publishes trust marks with their type and leaves out empty authority hints", async () => {
        const { keys } = await federationKeyChain();
        const trustMark = `${b64({ alg: "ES256", typ: "trust-mark+jwt" })}.${b64(
            {
                iss: "https://ta.example.org",
                sub: ENTITY_ID,
                trust_mark_type: "https://ta.example.org/marks/issuer",
                iat: 1,
            },
        )}.c2ln`;
        const provider = new LocalFederationEntityProvider(
            keys as never,
            () => NOW,
        );

        const jwt = await provider.getEntityConfiguration({
            tenantId: "tenant",
            entityId: ENTITY_ID,
            keyChainId: "fed",
            content: async () =>
                content({ authorityHints: [], trustMarks: [trustMark] }),
        });

        const claims = JSON.parse(
            Buffer.from(jwt.split(".")[1], "base64url").toString(),
        );
        expect(claims.authority_hints).toBeUndefined();
        expect(claims.trust_marks).toEqual([
            {
                trust_mark_type: "https://ta.example.org/marks/issuer",
                trust_mark: trustMark,
            },
        ]);
    });

    it("refuses a trust mark without trust_mark_type", async () => {
        const { keys } = await federationKeyChain();
        const provider = new LocalFederationEntityProvider(keys as never);

        await expect(
            provider.getEntityConfiguration({
                tenantId: "tenant",
                entityId: ENTITY_ID,
                content: async () =>
                    content({ trustMarks: [`${b64({})}.${b64({})}.c2ln`] }),
            }),
        ).rejects.toThrow("no trust_mark_type");
    });

    it("looks the federation key up before it builds the metadata", async () => {
        const { keys } = await federationKeyChain();
        keys.findByUsageType.mockRejectedValue(new Error("No key chain found"));
        const build = vi.fn(async () => content());

        await expect(
            new LocalFederationEntityProvider(
                keys as never,
            ).getEntityConfiguration({
                tenantId: "tenant",
                entityId: ENTITY_ID,
                content: build,
            }),
        ).rejects.toThrow("No key chain found");
        expect(build).not.toHaveBeenCalled();
    });
});
