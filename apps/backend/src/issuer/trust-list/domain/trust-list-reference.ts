/** A managed trust list that configurations of its tenant may reference. */
export interface ManagedTrustList {
    tenantId: string;
    id: string;
}

/** Kinds of configuration that can reference a managed trust list. */
export type TrustListReferenceKind =
    | "PresentationConfig"
    | "CredentialConfig"
    | "IssuanceConfig";

/** A configuration of the list's tenant that references the list. */
export interface TrustListReference {
    kind: TrustListReferenceKind;
    /** Configuration ID; absent for the issuance configuration, one per tenant. */
    id?: string;
    description?: string;
}

function decoded(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

/**
 * True when a URL names the managed trust list: `<TENANT_URL>/trust-list/<id>`,
 * or a URL with `/issuers/<tenant>/trust-list/<id>` such as the public URL of
 * the list, where the tenant is the list's tenant. The host is not compared.
 * A list whose ID only starts with the ID does not count.
 */
export function urlNamesTrustList(
    url: unknown,
    list: ManagedTrustList,
): boolean {
    if (typeof url !== "string" || !url) return false;
    const segments = url.split(/[?#]/, 1)[0].split("/");
    if (segments.at(-1) === "") segments.pop();
    const id = segments.pop();
    if (
        segments.pop() !== "trust-list" ||
        id === undefined ||
        decoded(id) !== list.id
    ) {
        return false;
    }
    if (segments.join("/") === "<TENANT_URL>") return true;
    const tenant = segments.pop();
    return (
        segments.pop() === "issuers" &&
        tenant !== undefined &&
        decoded(tenant) === list.tenantId
    );
}

/** True when a `trustListId` value names the list, ignoring surrounding spaces. */
export function trustListIdNamesList(
    trustListId: unknown,
    list: ManagedTrustList,
): boolean {
    return typeof trustListId === "string" && trustListId.trim() === list.id;
}

/**
 * True when a trust list reference (`{ trustListId }` or `{ url }`, as in
 * DCQL `etsi_tl` values and wallet provider trust lists) names the list.
 */
export function trustListRefNamesList(
    ref: unknown,
    list: ManagedTrustList,
): boolean {
    if (!ref || typeof ref !== "object") return false;
    const { trustListId, url } = ref as {
        trustListId?: unknown;
        url?: unknown;
    };
    return (
        trustListIdNamesList(trustListId, list) || urlNamesTrustList(url, list)
    );
}

/** Most configuration IDs of one kind the error message names. */
const NAMED_PER_KIND = 5;

const kindNames: Record<
    Exclude<TrustListReferenceKind, "IssuanceConfig">,
    { singular: string; plural: string }
> = {
    PresentationConfig: {
        singular: "presentation config",
        plural: "presentation configs",
    },
    CredentialConfig: {
        singular: "credential config",
        plural: "credential configs",
    },
};

function joinWithAnd(parts: string[]): string {
    return parts.length < 2
        ? (parts[0] ?? "")
        : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** Roles that read a kind of configuration, named for hidden references. */
export type TrustListReferenceReadRoles = (
    kind: TrustListReferenceKind,
) => readonly string[];

/** Names the IDs of one kind, or says which roles show them when they are hidden. */
function describeKind(
    kind: Exclude<TrustListReferenceKind, "IssuanceConfig">,
    references: TrustListReference[],
    readRoles?: TrustListReferenceReadRoles,
): string | undefined {
    const ofKind = references.filter((reference) => reference.kind === kind);
    if (ofKind.length === 0) return undefined;
    const { singular, plural } = kindNames[kind];
    const noun = `${ofKind.length} ${ofKind.length === 1 ? singular : plural}`;
    const ids = ofKind
        .filter((reference) => reference.id !== undefined)
        .map((reference) => JSON.stringify(reference.id));
    if (ids.length === 0) {
        const roles = readRoles?.(kind) ?? [];
        return roles.length > 0
            ? `${noun} (${roles.join(" or ")} shows which)`
            : noun;
    }
    const named = ids.slice(0, NAMED_PER_KIND);
    const more = ofKind.length - named.length;
    const names = more > 0 ? [...named, `${more} more`] : named;
    return `${noun} (${joinWithAnd(names)})`;
}

/**
 * The references without ID and description for the kinds the caller may not
 * read, so a refused delete does not reveal them; the count stays.
 */
export function referencesVisibleTo(
    references: TrustListReference[],
    mayRead: (kind: TrustListReferenceKind) => boolean,
): TrustListReference[] {
    return references.map((reference) =>
        mayRead(reference.kind) ? reference : { kind: reference.kind },
    );
}

/**
 * Message that names the configurations referencing the list; kinds whose
 * references carry no ID are only counted, with the roles that show them.
 */
export function trustListInUseMessage(
    trustListId: string,
    references: TrustListReference[],
    readRoles?: TrustListReferenceReadRoles,
): string {
    const parts = [
        describeKind("PresentationConfig", references, readRoles),
        describeKind("CredentialConfig", references, readRoles),
        references.some((reference) => reference.kind === "IssuanceConfig")
            ? "the issuance configuration (wallet provider trust lists)"
            : undefined,
    ].filter((part): part is string => part !== undefined);
    return `Trust list ${JSON.stringify(trustListId)} is still referenced by ${joinWithAnd(parts)}. Remove these references before deleting the trust list.`;
}

/** Thrown when a trust list cannot be deleted because configurations reference it. */
export class TrustListInUseError extends Error {
    constructor(
        readonly trustListId: string,
        readonly references: TrustListReference[],
    ) {
        super(trustListInUseMessage(trustListId, references));
        this.name = "TrustListInUseError";
    }
}
