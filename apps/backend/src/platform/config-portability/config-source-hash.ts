import { createHash } from "node:crypto";
import type { ConfigDocument } from "./config-resource.types.js";
import type { ConfigResourceMetadataEntity } from "./entities/config-resource-metadata.entity.js";

/**
 * The `sourceHash` that applying a plan records for a document. Other writers
 * store a hash of the raw file under their own source, so only a document
 * applied through a plan from the same source can match it.
 */
export function documentSourceHash(document: ConfigDocument): string {
    return createHash("sha256").update(JSON.stringify(document)).digest("hex");
}

/**
 * Some documents never equal their resource once applied:
 *
 * - A key chain: importers add key IDs, EUDIPLO creates the signing key of a
 *   CA key, and rotation or registrar enrollment replace keys and
 *   certificates.
 * - A client with `"secret": "!generate"`: applying it generates a new secret.
 *
 * So such a document that this source applied as it is, while the resource
 * stayed file-managed, is unchanged, without comparing it with the stored
 * resource.
 */
export function documentAppliedAsIs(
    document: ConfigDocument,
    metadata: Pick<
        ConfigResourceMetadataEntity,
        "ownership" | "source" | "sourceHash"
    >,
    source: string,
): boolean {
    const neverEqual =
        document.kind === "KeyChain" ||
        (document.kind === "Client" && document.spec.secret === "!generate");
    return (
        neverEqual &&
        metadata.ownership === "file-managed" &&
        metadata.source === source &&
        metadata.sourceHash === documentSourceHash(document)
    );
}
