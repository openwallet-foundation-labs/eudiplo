import { IssuanceConfigurationNotFound } from "../../../issuer/configuration/issuance/domain/issuance-configuration.js";
import {
    ownFederationEntity,
    ownTrustChain,
} from "../../../issuer/configuration/issuance/domain/own-federation-entity.js";
import type { IssuanceService } from "../../../issuer/configuration/issuance/issuance.service.js";
import type { FederationTrustService } from "../../../trust/federation-trust.service.js";
import type {
    VerifierFederationEntity,
    VerifierFederationIdentity,
} from "../ports/verifier-federation-identity.js";

/**
 * Reads the tenant's federation entity from the `federation` block of its
 * issuance configuration, which describes the one entity of the tenant for
 * both roles.
 */
export class IssuanceConfigVerifierFederationIdentity
    implements VerifierFederationIdentity
{
    constructor(
        private readonly issuance: Pick<
            IssuanceService,
            "getIssuanceConfiguration"
        >,
        private readonly federation: Pick<
            FederationTrustService,
            "resolveEntity"
        >,
    ) {}

    async forTenant(
        tenantId: string,
    ): Promise<VerifierFederationEntity | undefined> {
        const entity = await this.entity(tenantId);
        if (!entity?.entityTypes.includes("openid_credential_verifier")) {
            return undefined;
        }
        return {
            entityId: entity.entityId,
            includeTrustChain: entity.includeTrustChain,
        };
    }

    async trustChain(tenantId: string): Promise<string[]> {
        const config = await this.issuance.getIssuanceConfiguration(tenantId);
        return ownTrustChain(config.federation, (entityId, source) =>
            // Pinned trust anchor keys are registered per tenant.
            this.federation.resolveEntity(entityId, {
                ...source,
                tenantId,
            } as never),
        );
    }

    private async entity(tenantId: string) {
        const config = await this.issuance
            .getIssuanceConfiguration(tenantId)
            .catch(notConfigured);
        return ownFederationEntity(config?.federation);
    }
}

/** A tenant without issuance configuration has no federation entity; other errors stay errors. */
function notConfigured(error: unknown): undefined {
    if (error instanceof IssuanceConfigurationNotFound) return undefined;
    throw error;
}
