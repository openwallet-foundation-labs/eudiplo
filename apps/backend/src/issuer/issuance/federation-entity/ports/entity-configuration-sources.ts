import type { OwnFederationEntity } from "../../../configuration/issuance/domain/own-federation-entity.js";
import type { CredentialIssuerEntityParts } from "../domain/entity-metadata.js";

/** What the entity configuration of a tenant is built from. */
export interface EntityConfigurationSources {
    /**
     * The tenant's own federation entity and a version that changes with its
     * configuration, or `undefined` when the tenant takes no part in a
     * federation.
     */
    ownEntity(
        tenantId: string,
    ): Promise<{ entity: OwnFederationEntity; version: string } | undefined>;
    credentialIssuer(tenantId: string): Promise<CredentialIssuerEntityParts>;
    /** `openid_credential_verifier` metadata, `jwks` included. */
    credentialVerifier(tenantId: string): Promise<Record<string, unknown>>;
}

export const ENTITY_CONFIGURATION_SOURCES = Symbol(
    "ENTITY_CONFIGURATION_SOURCES",
);
