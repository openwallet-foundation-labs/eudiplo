import type { JWK } from "jose";
import type {
    FederationTrustAnchorKeys,
    PinnedJwks,
} from "../../ports/federation-trust-anchor-keys.js";
import type { FederationTrustAnchorRepository } from "../ports/federation-trust-anchor.repository.js";

/** The pinned keys of the trust anchors registered in the repository. */
export class RepositoryFederationTrustAnchorKeys
    implements FederationTrustAnchorKeys
{
    constructor(private readonly repository: FederationTrustAnchorRepository) {}

    async findPinnedKeys(
        tenantId: string,
        entityIds: string[],
    ): Promise<Map<string, PinnedJwks>> {
        const anchors = await this.repository.findByEntityIds(
            tenantId,
            entityIds,
        );
        return new Map(
            anchors.map((anchor) => [
                anchor.entityId,
                // The schema admits only public keys with kid.
                { keys: anchor.jwks.keys as JWK[] },
            ]),
        );
    }
}
