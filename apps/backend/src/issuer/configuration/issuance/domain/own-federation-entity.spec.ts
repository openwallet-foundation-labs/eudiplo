import { describe, expect, it } from "vitest";
import {
    federationEntityIdProblem,
    ownFederationEntity,
} from "./own-federation-entity.js";

describe("federationEntityIdProblem", () => {
    it.each([
        "https://issuer.example.org",
        "https://issuer.example.org/issuers/tenant",
        "https://issuer.example.org:8443/issuers/tenant/",
    ])("accepts the Entity Identifier %s", (entityId) => {
        expect(
            federationEntityIdProblem(entityId, { allowHttp: false }),
        ).toBeUndefined();
    });

    it.each([
        ["issuer", "is not a URL"],
        ["urn:example:issuer", "must be an https URL"],
        ["http://localhost:3000/issuers/root", "OUTBOUND_URL_ALLOW_HTTP"],
        ["https://issuer.example.org/?tenant=a", "query or fragment"],
        ["https://issuer.example.org/?", "query or fragment"],
        ["https://issuer.example.org/#entity", "query or fragment"],
        ["https://user:pw@issuer.example.org", "credentials"],
        ["https://issuer.example.org/x\nfoo", "whitespace or control"],
        [" https://issuer.example.org", "whitespace or control"],
        ["https://issuer.example.org/\u0000", "whitespace or control"],
        ["HTTPS://issuer.example.org", "https://issuer.example.org/"],
        ["https:/issuer.example.org", "https://issuer.example.org/"],
        ["https:///issuer.example.org", "https://issuer.example.org/"],
        ["https://issuer\\example.org/a", "must be written as the URL"],
        ["https://bücher.example", "https://xn--bcher-kva.example/"],
        ["https://issuer.example.org:443/a", "https://issuer.example.org/a"],
    ])("refuses %s", (entityId, reason) => {
        expect(
            federationEntityIdProblem(entityId, { allowHttp: false }),
        ).toContain(reason);
    });

    it("accepts http only with allowHttp", () => {
        expect(
            federationEntityIdProblem("http://localhost:3000/issuers/root", {
                allowHttp: true,
            }),
        ).toBeUndefined();
        expect(
            federationEntityIdProblem("ftp://issuer.example.org", {
                allowHttp: true,
            }),
        ).toContain("https or http URL");
    });
});

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
