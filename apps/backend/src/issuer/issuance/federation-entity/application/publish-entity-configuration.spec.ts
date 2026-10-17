import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../../../../shared/domain/not-found-error.js";
import type { EntityConfigurationRequest } from "../../../../trust/ports/federation-entity-provider.js";
import { ownFederationEntity } from "../../../configuration/issuance/domain/own-federation-entity.js";
import {
    ENTITY_CONFIGURATION_CACHE_MS,
    ENTITY_CONFIGURATION_FAILURE_CACHE_MS,
    PublishEntityConfiguration,
} from "./publish-entity-configuration.js";

const ENTITY_ID = "https://eudiplo.example/issuers/tenant";

function fixture(
    entityTypes: (
        | "openid_credential_issuer"
        | "openid_credential_verifier"
    )[] = ["openid_credential_issuer"],
) {
    let version = "1";
    let now = 1_000_000;
    const entity = ownFederationEntity({
        entityId: ENTITY_ID,
        trustAnchors: [{ entityId: "https://ta.example.org" }],
        entityTypes,
        entityKeyChainId: "fed",
    })!;
    const sources = {
        ownEntity: vi.fn(async () => ({ entity, version })),
        credentialIssuer: vi.fn(async () => ({
            metadata: { credential_issuer: ENTITY_ID },
            authorizationServers: [{ issuer: ENTITY_ID }],
            signingKeys: [{ kty: "EC", kid: "credential-key" }],
        })),
        credentialVerifier: vi.fn(async () => ({
            jwks: { keys: [{ kty: "EC", kid: "access-key", use: "sig" }] },
        })),
    };
    const provider = {
        getEntityConfiguration: vi.fn(
            async (request: EntityConfigurationRequest) =>
                JSON.stringify(await request.content()),
        ),
    };
    const useCase = new PublishEntityConfiguration(
        sources,
        provider,
        () => now,
    );
    return {
        sources,
        provider,
        useCase,
        setVersion: (next: string) => {
            version = next;
        },
        advance: (ms: number) => {
            now += ms;
        },
    };
}

describe("PublishEntityConfiguration", () => {
    it("answers not found for a tenant without a federation entity", async () => {
        const f = fixture();
        f.sources.ownEntity.mockResolvedValue(undefined as never);

        await expect(f.useCase.execute("tenant")).rejects.toBeInstanceOf(
            NotFoundError,
        );
        expect(f.provider.getEntityConfiguration).not.toHaveBeenCalled();
    });

    it("builds issuer metadata, the built-in authorization server and the defaults", async () => {
        const f = fixture();

        const content = JSON.parse(await f.useCase.execute("tenant"));

        expect(f.provider.getEntityConfiguration).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: "tenant",
                entityId: ENTITY_ID,
            }),
        );
        expect(f.provider.getEntityConfiguration).toHaveBeenCalledWith(
            expect.objectContaining({ keyChainId: "fed" }),
        );
        expect(content).toEqual({
            authorityHints: ["https://ta.example.org"],
            trustMarks: [],
            lifetimeSeconds: 86400,
            metadata: {
                federation_entity: {},
                openid_credential_issuer: {
                    credential_issuer: ENTITY_ID,
                    jwks: {
                        keys: [
                            { kty: "EC", kid: "credential-key", use: "sig" },
                        ],
                    },
                },
                oauth_authorization_server: { issuer: ENTITY_ID },
            },
        });
        expect(f.sources.credentialVerifier).not.toHaveBeenCalled();
    });

    it("publishes only verifier metadata for a verifier entity", async () => {
        const f = fixture(["openid_credential_verifier"]);

        const { metadata } = JSON.parse(await f.useCase.execute("tenant"));

        expect(Object.keys(metadata).sort()).toEqual([
            "federation_entity",
            "openid_credential_verifier",
        ]);
        expect(f.sources.credentialIssuer).not.toHaveBeenCalled();
    });

    it("reuses the signed entity configuration until it expires or the configuration changes", async () => {
        const f = fixture();

        await f.useCase.execute("tenant");
        await f.useCase.execute("tenant");
        expect(f.provider.getEntityConfiguration).toHaveBeenCalledTimes(1);

        f.setVersion("2");
        await f.useCase.execute("tenant");
        expect(f.provider.getEntityConfiguration).toHaveBeenCalledTimes(2);

        f.advance(ENTITY_CONFIGURATION_CACHE_MS + 1);
        await f.useCase.execute("tenant");
        expect(f.provider.getEntityConfiguration).toHaveBeenCalledTimes(3);
    });

    it("shares one attempt between concurrent requests", async () => {
        const f = fixture();

        await Promise.all([
            f.useCase.execute("tenant"),
            f.useCase.execute("tenant"),
            f.useCase.execute("tenant"),
        ]);

        expect(f.provider.getEntityConfiguration).toHaveBeenCalledTimes(1);
    });

    it("answers a failure again for ten seconds before it retries", async () => {
        const f = fixture();
        f.provider.getEntityConfiguration.mockRejectedValue(
            new Error("trust engine down"),
        );

        await expect(f.useCase.execute("tenant")).rejects.toThrow("down");
        await expect(f.useCase.execute("tenant")).rejects.toThrow("down");
        expect(f.provider.getEntityConfiguration).toHaveBeenCalledTimes(1);

        f.advance(ENTITY_CONFIGURATION_FAILURE_CACHE_MS + 1);
        await expect(f.useCase.execute("tenant")).rejects.toThrow("down");
        expect(f.provider.getEntityConfiguration).toHaveBeenCalledTimes(2);
    });
});
