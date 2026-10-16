import {
    isConfigDocument,
    migrateDocument,
    normalizeDocument,
} from "@eudiplo/config-format/config-format.js";
import { validateConfigDocument } from "@eudiplo/config-format/config-validator.js";
import { BadRequestException } from "@nestjs/common";

/**
 * Content of a `kms.json` file as the KMS configuration schema expects it.
 *
 * The file is either a configuration document (`$schema` + `spec`, any
 * supported KmsConfig version, migrated to the current one) or a bare file
 * holding only the `spec` content, which is returned unchanged.
 */
export function kmsConfigFileSpec(payload: unknown, source: string): unknown {
    if (!isConfigDocument(payload)) {
        return payload;
    }
    let migrated: ReturnType<typeof migrateDocument>;
    try {
        const { kind } = normalizeDocument(payload);
        if (kind !== "KmsConfig") {
            throw new Error(`expected a KmsConfig document, got ${kind}`);
        }
        migrated = migrateDocument(payload, validateConfigDocument);
    } catch (error) {
        throw new BadRequestException(
            `${source}: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
    const blocking = migrated.issues.filter(
        (issue) => issue.severity !== "warning",
    );
    if (blocking.length > 0) {
        throw new BadRequestException(
            `${source}: ${blocking.map((issue) => issue.message).join("; ")}`,
        );
    }
    return migrated.document.spec;
}
