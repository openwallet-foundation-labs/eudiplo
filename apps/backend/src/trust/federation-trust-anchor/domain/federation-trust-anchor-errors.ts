import { ConflictError } from "../../../shared/domain/conflict-error.js";
import { NotFoundError } from "../../../shared/domain/not-found-error.js";

export class FederationTrustAnchorNotFound extends NotFoundError {
    constructor(readonly id: string) {
        super(`Federation trust anchor '${id}' not found`);
        this.name = "FederationTrustAnchorNotFound";
    }
}

export class FederationTrustAnchorConflict extends ConflictError {
    constructor(message: string) {
        super(message);
        this.name = "FederationTrustAnchorConflict";
    }
}

/**
 * Why a configuration that names `missing` trust anchors is rejected: a
 * trust anchor without pinned keys is never trusted.
 */
export function unregisteredTrustAnchorsMessage(missing: string[]): string {
    return `OpenID Federation trust anchors without pinned keys: ${missing.join(", ")}. Register each as a federation trust anchor with its federation keys first.`;
}
