import {
    defineEditorSchema,
    defineEditorSchemaBundle,
} from "../../../shared/common/zod/editor-schema.js";
import {
    CreateFederationTrustAnchorSchema,
    UpdateFederationTrustAnchorSchema,
} from "./federation-trust-anchor.schema.js";

export const federationTrustAnchorEditorSchemaBundle = defineEditorSchemaBundle(
    {
        domain: "federation-trust-anchor",
        schemas: [
            defineEditorSchema({
                name: "CreateFederationTrustAnchorDto",
                schema: CreateFederationTrustAnchorSchema,
            }),
            defineEditorSchema({
                name: "UpdateFederationTrustAnchorDto",
                schema: UpdateFederationTrustAnchorSchema,
            }),
        ],
    },
);
