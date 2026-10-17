import { describe, expect, it } from "vitest";
import { ownFederationEntity } from "./own-federation-entity.js";

describe("ownFederationEntity", () => {
    it("needs an entity id and a trust anchor", () => {
        expect(ownFederationEntity(undefined)).toBeUndefined();
        expect(
            ownFederationEntity({
                entityId: "https://issuer.example.org",
                trustAnchors: [],
            }),
        ).toBeUndefined();
        expect(
            ownFederationEntity({
                trustAnchors: [{ entityId: "https://ta.example.org" }],
            }),
        ).toBeUndefined();
    });

    it("applies the defaults: issuer role, trust anchors as authority hints, one day", () => {
        expect(
            ownFederationEntity({
                entityId: "https://issuer.example.org",
                trustAnchors: [{ entityId: "https://ta.example.org" }],
            }),
        ).toEqual({
            entityId: "https://issuer.example.org",
            entityTypes: ["openid_credential_issuer"],
            authorityHints: ["https://ta.example.org"],
            keyChainId: undefined,
            lifetimeSeconds: 86400,
            trustMarks: [],
            entityMetadata: {},
            includeTrustChain: false,
        });
    });

    it("keeps configured values", () => {
        expect(
            ownFederationEntity({
                entityId: "https://issuer.example.org",
                trustAnchors: [{ entityId: "https://ta.example.org" }],
                entityTypes: [
                    "openid_credential_verifier",
                    "openid_credential_verifier",
                ],
                authorityHints: ["https://intermediate.example.org"],
                entityKeyChainId: "fed",
                entityConfigurationLifetimeSeconds: 600,
                includeTrustChain: true,
            }),
        ).toMatchObject({
            entityTypes: ["openid_credential_verifier"],
            authorityHints: ["https://intermediate.example.org"],
            keyChainId: "fed",
            lifetimeSeconds: 600,
            includeTrustChain: true,
        });
    });
});
