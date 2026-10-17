import type { JWK } from "jose";
import type { OwnFederationEntity } from "../../../configuration/issuance/domain/own-federation-entity.js";

export type CredentialIssuerEntityParts = {
    /** OID4VCI credential issuer metadata as served at the well-known URL. */
    metadata: Record<string, unknown>;
    /** Metadata of the advertised authorization servers. */
    authorizationServers: Record<string, unknown>[];
    /** Public keys that sign credentials and status lists. */
    signingKeys: JWK[];
};

/**
 * The `metadata` claim of the tenant's entity configuration. The protocol
 * metadata is the one EUDIPLO serves anyway; the federation entity keys are
 * never part of it.
 *
 * - `openid_credential_issuer` carries the credential and status list
 *   signing keys in `jwks`, so a federation verifier can select the key of a
 *   credential or status list by its `kid`.
 * - `oauth_authorization_server` is the built-in authorization server, added
 *   only when its issuer is the entity identifier (OpenID Federation
 *   Section 5.1.3).
 */
export function buildEntityMetadata(parts: {
    entity: OwnFederationEntity;
    credentialIssuer?: CredentialIssuerEntityParts;
    credentialVerifier?: Record<string, unknown>;
}): Record<string, Record<string, unknown>> {
    const metadata: Record<string, Record<string, unknown>> = {
        federation_entity: { ...parts.entity.entityMetadata },
    };
    if (parts.credentialIssuer) {
        const {
            metadata: issuer,
            authorizationServers,
            signingKeys,
        } = parts.credentialIssuer;
        metadata.openid_credential_issuer = {
            ...issuer,
            jwks: { keys: signingKeys.map((key) => withUse(key, "sig")) },
        };
        const authorizationServer = authorizationServers.find(
            (server) => server.issuer === parts.entity.entityId,
        );
        if (authorizationServer) {
            metadata.oauth_authorization_server = { ...authorizationServer };
        }
    }
    if (parts.credentialVerifier) {
        metadata.openid_credential_verifier = { ...parts.credentialVerifier };
    }
    return metadata;
}

/** A key without `use` could be picked for another purpose by a wallet. */
export function withUse(key: JWK, use: "sig" | "enc"): JWK {
    return key.use ? key : { ...key, use };
}
