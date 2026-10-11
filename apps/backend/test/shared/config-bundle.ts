import { createHash } from "node:crypto";
import { schemaUrl } from "@eudiplo/config-format/config-format.js";
import type {
    ConfigBundle,
    ConfigResourceKind,
} from "../../src/platform/config-portability/config-resource.types.js";

export interface BundleDocument {
    kind: ConfigResourceKind;
    id: string;
    /** Path of the document inside the bundle, for example `key-chains/<id>.json`. */
    path: string;
    spec: Record<string, unknown>;
}

/** Adds a document in the current format version, with its manifest entry and checksum. */
export function addBundleDocument(
    bundle: ConfigBundle,
    { kind, id, path, spec }: BundleDocument,
): ConfigBundle {
    const document = {
        $schema: schemaUrl(kind),
        metadata: { generation: 1 },
        spec,
    };
    bundle.documents.push(document);
    bundle.manifest.resources.push({
        kind,
        id,
        $schema: document.$schema,
        path,
        sha256: createHash("sha256")
            .update(JSON.stringify(document))
            .digest("hex"),
        ownership: "unmanaged",
        generation: 1,
    });
    return bundle;
}

/** A configuration bundle of a tenant with the given documents and no assets. */
export function configBundle(
    tenant: string,
    documents: BundleDocument[],
): ConfigBundle {
    const bundle = {
        manifest: {
            format: "eudiplo.config-bundle",
            formatVersion: 2,
            sourceVersion: "document-import",
            exportedAt: new Date(0).toISOString(),
            tenant,
            resources: [],
            assets: [],
            requirements: [],
            warnings: [],
        },
        documents: [],
        assets: [],
    } as unknown as ConfigBundle;
    for (const document of documents) addBundleDocument(bundle, document);
    return bundle;
}

/** A bundle of key chain documents. */
export function keyChainBundle(
    tenant: string,
    specs: Record<string, unknown>[],
): ConfigBundle {
    return configBundle(
        tenant,
        specs.map((spec) => ({
            kind: "KeyChain",
            id: String(spec.id),
            path: `key-chains/${spec.id}.json`,
            spec,
        })),
    );
}
