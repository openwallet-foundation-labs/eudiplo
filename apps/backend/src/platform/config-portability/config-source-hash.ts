import { createHash } from "node:crypto";
import type { ConfigDocument } from "./config-resource.types.js";

/**
 * The `sourceHash` that applying a plan records for a document. Other writers
 * store a hash of the raw file under their own source, so only a document
 * applied through a plan from the same source can match it.
 */
export function documentSourceHash(document: ConfigDocument): string {
    return createHash("sha256").update(JSON.stringify(document)).digest("hex");
}
