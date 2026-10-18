import type { FederationTrustService } from "../../../../trust/federation-trust.service.js";
import {
    federationEntityIdProblem,
    ownFederationEntity,
    ownTrustChain,
} from "../../issuance/domain/own-federation-entity.js";
import type { IssuanceService } from "../../issuance/issuance.service.js";
import type { IssuerFederationContext } from "../ports/credential-generation-context.js";

export class ConfiguredIssuerFederationContext
    implements IssuerFederationContext
{
    constructor(
        private readonly issuance: Pick<
            IssuanceService,
            "getIssuanceConfiguration"
        >,
        private readonly federation: Pick<
            FederationTrustService,
            "isEnabled" | "resolveEntity"
        >,
    ) {}
    /**
     * The entity ID for federation SD-JWT VCs: only when the tenant's entity
     * publishes `openid_credential_issuer` metadata with the signing keys, as
     * a verifier finds the credential's `kid` nowhere else.
     */
    async entityIdForTenant(tenantId: string) {
        const config = await this.issuance.getIssuanceConfiguration(tenantId);
        if (!config.federation || !this.federation.isEnabled(config.federation))
            return undefined;
        const entity = ownFederationEntity(config.federation);
        // A stored entity ID saved before EUDIPLO validated it resolves
        // nowhere, so the credential falls back to x5c. http is checked
        // when the configuration is saved.
        return entity?.entityTypes.includes("openid_credential_issuer") &&
            !federationEntityIdProblem(entity.entityId, { allowHttp: true })
            ? entity.entityId
            : undefined;
    }

    async trustChainForTenant(tenantId: string) {
        const config = await this.issuance.getIssuanceConfiguration(tenantId);
        if (!ownFederationEntity(config.federation)?.includeTrustChain) {
            return undefined;
        }
        return ownTrustChain(config.federation, (entityId, source) =>
            // Pinned trust anchor keys are registered per tenant.
            this.federation.resolveEntity(entityId, {
                ...source,
                tenantId,
            } as never),
        );
    }
}
