export type {
    ClaimDisplayInfoV1,
    ClaimFieldDefinition,
    ClaimMetadataV1,
    ClaimPathElement,
    CredentialConfigV1,
    CredentialConfigV2,
    CredentialFormat,
    FieldDisplay,
    FieldType,
    JsonSchema,
} from "./v2-types";

export {
    buildClaims,
    buildClaimsByNamespace,
    buildClaimsMetadata,
    buildDisclosureFrame,
    buildJsonSchema,
} from "./derive";

export { convertV1ToV2, deriveRuntimeArtifacts } from "./migrate";
