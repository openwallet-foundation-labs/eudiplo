/** Kinds of configuration that name federation trust anchors by entity ID. */
const FEDERATION_TRUST_ANCHOR_REFERENCE_KINDS = [
    "IssuanceConfig",
    "PresentationConfig",
] as const;

export type FederationTrustAnchorReferenceKind =
    (typeof FEDERATION_TRUST_ANCHOR_REFERENCE_KINDS)[number];

export function isFederationTrustAnchorReferenceKind(
    kind: string,
): kind is FederationTrustAnchorReferenceKind {
    return (
        FEDERATION_TRUST_ANCHOR_REFERENCE_KINDS as readonly string[]
    ).includes(kind);
}

/** A configuration of the anchor's tenant that names the anchor's entity ID. */
export interface FederationTrustAnchorReference {
    kind: FederationTrustAnchorReferenceKind;
    /** Configuration ID; absent for the issuance configuration, one per tenant. */
    id?: string;
    description?: string;
}

/**
 * The ID a reference to the configuration carries: none for the issuance
 * configuration, which a tenant has once.
 */
export function federationTrustAnchorReferenceId(
    kind: FederationTrustAnchorReferenceKind,
    id: string,
): string | undefined {
    return kind === "IssuanceConfig" ? undefined : id;
}

/** Most presentation config IDs the message names. */
const NAMED_PRESENTATION_CONFIGS = 5;

/** Roles that read a kind of configuration, named for hidden references. */
export type FederationTrustAnchorReferenceReadRoles = (
    kind: FederationTrustAnchorReferenceKind,
) => readonly string[];

function joinWithAnd(parts: string[]): string {
    return parts.length < 2
        ? (parts[0] ?? "")
        : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/**
 * Names the configurations naming an entity ID, such as `1 presentation
 * config ("pid") and the issuance configuration (federation.trustAnchors)`;
 * presentation configs without ID are only counted, with the roles that show
 * them.
 */
export function describeFederationTrustAnchorReferences(
    references: FederationTrustAnchorReference[],
    readRoles?: FederationTrustAnchorReferenceReadRoles,
): string {
    const parts: string[] = [];
    const presentations = references.filter(
        (reference) => reference.kind === "PresentationConfig",
    );
    if (presentations.length > 0) {
        const noun = `${presentations.length} presentation ${presentations.length === 1 ? "config" : "configs"}`;
        const ids = presentations
            .filter((reference) => reference.id !== undefined)
            .map((reference) => JSON.stringify(reference.id));
        if (ids.length === 0) {
            const roles = readRoles?.("PresentationConfig") ?? [];
            parts.push(
                roles.length > 0
                    ? `${noun} (${roles.join(" or ")} shows which)`
                    : noun,
            );
        } else {
            const named = ids.slice(0, NAMED_PRESENTATION_CONFIGS);
            const more = presentations.length - named.length;
            parts.push(
                `${noun} (${joinWithAnd(more > 0 ? [...named, `${more} more`] : named)})`,
            );
        }
    }
    if (references.some((reference) => reference.kind === "IssuanceConfig")) {
        parts.push("the issuance configuration (federation.trustAnchors)");
    }
    return joinWithAnd(parts);
}

/**
 * The references without ID and description for the kinds the caller may not
 * read, so a refused change does not reveal them; the count stays.
 */
export function federationTrustAnchorReferencesVisibleTo(
    references: FederationTrustAnchorReference[],
    mayRead: (kind: FederationTrustAnchorReferenceKind) => boolean,
): FederationTrustAnchorReference[] {
    return references.map((reference) =>
        mayRead(reference.kind) ? reference : { kind: reference.kind },
    );
}

/** What the refused change does to the anchor. */
export type FederationTrustAnchorChange = "delete" | "change-entity-id";

/** Message that names the configurations naming the anchor's entity ID. */
export function federationTrustAnchorInUseMessage(
    anchorId: string,
    entityId: string,
    change: FederationTrustAnchorChange,
    references: FederationTrustAnchorReference[],
    readRoles?: FederationTrustAnchorReferenceReadRoles,
): string {
    const action =
        change === "delete" ? "deleting it" : "changing its entity ID";
    return `Federation trust anchor ${JSON.stringify(anchorId)} (${entityId}) is still named by ${describeFederationTrustAnchorReferences(references, readRoles)}. Remove these references before ${action}.`;
}

/**
 * Thrown when a trust anchor cannot be deleted, or its entity ID changed,
 * because configurations name its entity ID.
 */
export class FederationTrustAnchorInUseError extends Error {
    constructor(
        readonly anchorId: string,
        readonly entityId: string,
        readonly change: FederationTrustAnchorChange,
        readonly references: FederationTrustAnchorReference[],
    ) {
        super(
            federationTrustAnchorInUseMessage(
                anchorId,
                entityId,
                change,
                references,
            ),
        );
        this.name = "FederationTrustAnchorInUseError";
    }
}
