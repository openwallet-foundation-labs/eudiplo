import { describe, expect, it } from "vitest";
import { ownFederationEntity } from "../../../configuration/issuance/domain/own-federation-entity.js";
import { buildEntityMetadata } from "./entity-metadata.js";

const entity = ownFederationEntity({
    entityId: "https://issuer.example.org",
    trustAnchors: [{ entityId: "https://ta.example.org" }],
    entityMetadata: { organization_name: "Example" },
})!;

describe("buildEntityMetadata", () => {
    it("leaves out authorization servers whose issuer is not the entity id", () => {
        const metadata = buildEntityMetadata({
            entity,
            credentialIssuer: {
                metadata: { credential_issuer: "https://issuer.example.org" },
                authorizationServers: [{ issuer: "https://as.example.org" }],
                signingKeys: [{ kty: "EC", kid: "k", use: "sig" }],
            },
        });

        expect(metadata).toEqual({
            federation_entity: { organization_name: "Example" },
            openid_credential_issuer: {
                credential_issuer: "https://issuer.example.org",
                jwks: { keys: [{ kty: "EC", kid: "k", use: "sig" }] },
            },
        });
    });
});
