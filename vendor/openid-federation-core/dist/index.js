"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  MetadataMergeStrategy: () => MetadataMergeStrategy,
  MetadataOrderOfApplication: () => MetadataOrderOfApplication,
  OpenIdFederationError: () => OpenIdFederationError,
  PolicyErrorStage: () => PolicyErrorStage,
  PolicyOperatorMergeError: () => PolicyOperatorMergeError,
  PolicyValidationError: () => PolicyValidationError,
  addOperator: () => addOperator,
  addPaths: () => addPaths,
  addSearchParams: () => addSearchParams,
  allSupportedPolicies: () => allSupportedPolicies,
  applyMetadataPolicyToMetadata: () => applyMetadataPolicyToMetadata,
  base64ToBase64URL: () => base64ToBase64URL,
  combineMetadataPolicies: () => combineMetadataPolicies,
  constraintSchema: () => constraintSchema,
  createEntityConfiguration: () => createEntityConfiguration,
  createEntityStatement: () => createEntityStatement,
  createJsonWebToken: () => createJsonWebToken,
  createJwtSignableInput: () => createJwtSignableInput,
  createPolicyOperatorSchema: () => createPolicyOperatorSchema,
  dateSchema: () => dateSchema,
  defaultOperator: () => defaultOperator,
  entityConfigurationClaimsSchema: () => entityConfigurationClaimsSchema,
  entityConfigurationHeaderSchema: () => entityConfigurationHeaderSchema,
  entityStatementClaimsSchema: () => entityStatementClaimsSchema,
  entityStatementHeaderSchema: () => entityStatementHeaderSchema,
  essentialOperator: () => essentialOperator,
  federationEntityMetadata: () => federationEntityMetadata,
  fetchEntityConfiguration: () => fetchEntityConfiguration,
  fetchEntityConfigurationChains: () => fetchEntityConfigurationChains,
  fetchEntityStatement: () => fetchEntityStatement,
  fetchEntityStatementChain: () => fetchEntityStatementChain,
  fetcher: () => fetcher,
  getUsedJsonWebKey: () => getUsedJsonWebKey,
  hasMediaType: () => hasMediaType,
  isExistingPolicyKey: () => isExistingPolicyKey,
  isSameEntityId: () => isSameEntityId,
  jsonWebKeySchema: () => jsonWebKeySchema,
  jsonWebKeySetSchema: () => jsonWebKeySetSchema,
  jsonWebTokenSchema: () => jsonWebTokenSchema,
  metadataPolicySchema: () => metadataPolicySchema,
  metadataSchema: () => metadataSchema,
  oauthAuthorizationServerEntityMetadata: () => oauthAuthorizationServerEntityMetadata,
  oauthClientEntityMetadata: () => oauthClientEntityMetadata,
  oauthResourceEntityMetadata: () => oauthResourceEntityMetadata,
  oneOfOperator: () => oneOfOperator,
  openIdCredentialIssuerEntityMetadata: () => openIdCredentialIssuerEntityMetadata,
  openIdProviderEntityMetadata: () => openIdProviderEntityMetadata,
  openidCredentialVerifierEntityMetadata: () => openidCredentialVerifierEntityMetadata,
  openidRelyingPartyEntityMetadata: () => openidRelyingPartyEntityMetadata,
  resolveTrustChains: () => resolveTrustChains,
  resolveTrustChainsWithFailures: () => resolveTrustChainsWithFailures,
  stringifyJwtPart: () => stringifyJwtPart,
  subsetOfOperator: () => subsetOfOperator,
  supersetOfOperator: () => supersetOfOperator,
  swapValidators: () => swapValidators,
  trustMarkClaimsSchema: () => trustMarkClaimsSchema,
  trustMarkIssuerSchema: () => trustMarkIssuerSchema,
  trustMarkOwnerSchema: () => trustMarkOwnerSchema,
  trustMarkSchema: () => trustMarkSchema,
  valueOperator: () => valueOperator
});
module.exports = __toCommonJS(index_exports);

// src/constraints.ts
var import_zod = require("zod");
var constraintSchema = import_zod.z.object({
  max_path_length: import_zod.z.number().optional(),
  naming_constraints: import_zod.z.object({
    permitted: import_zod.z.array(import_zod.z.string()).optional(),
    excluded: import_zod.z.array(import_zod.z.string()).optional()
  }).optional(),
  allowed_entity_types: import_zod.z.array(
    import_zod.z.string().refine((s) => s !== "federation_entity", {
      message: `Value cannot be "federation_entity"`
    })
  ).optional()
});

// src/jsonWeb/jsonWebKey.ts
var import_zod2 = require("zod");
var jsonWebKeySchema = import_zod2.z.object({
  kty: import_zod2.z.string(),
  // TODO: spec mentions kid may be undefined, but we always need a key id for open id federation
  kid: import_zod2.z.string(),
  use: import_zod2.z.string().optional(),
  key_ops: import_zod2.z.array(import_zod2.z.string()).optional(),
  alg: import_zod2.z.string().optional(),
  x5u: import_zod2.z.string().optional(),
  x5c: import_zod2.z.array(import_zod2.z.string()).optional(),
  x5t: import_zod2.z.string().optional(),
  "x5t#S256": import_zod2.z.string().optional()
}).passthrough();

// src/jsonWeb/jsonWebKeySet.ts
var import_zod3 = require("zod");
var jsonWebKeySetSchema = import_zod3.z.object({
  keys: import_zod3.z.array(jsonWebKeySchema)
});

// src/jsonWeb/jsonWebToken.ts
var import_buffer = require("buffer");
var import_zod4 = require("zod");

// src/error/PolicyErrorStage.ts
var PolicyErrorStage = /* @__PURE__ */ ((PolicyErrorStage2) => {
  PolicyErrorStage2["Generic"] = "generic";
  PolicyErrorStage2["Validation"] = "validation";
  PolicyErrorStage2["MetadataPolicyCrit"] = "metadataPolicyCrit";
  PolicyErrorStage2["PolicyMerge"] = "policyMerge";
  PolicyErrorStage2["PolicyApply"] = "policyApply";
  return PolicyErrorStage2;
})(PolicyErrorStage || {});

// src/error/OpenIdFederationError.ts
var OpenIdFederationError = class _OpenIdFederationError extends Error {
  constructor(errorCode, message, cause) {
    super(message);
    this.errorCode = errorCode;
    this.cause = cause;
  }
  static fromZodError(zodError) {
    return new _OpenIdFederationError("validation" /* Validation */, void 0, zodError);
  }
  static isMetadataPolicyCritError(error) {
    return error instanceof _OpenIdFederationError && error.errorCode === "metadataPolicyCrit" /* MetadataPolicyCrit */;
  }
};

// src/utils/validate.ts
var validate = ({
  schema,
  data,
  errorMessage
}) => {
  try {
    return schema.parse(data);
  } catch (e) {
    const error = OpenIdFederationError.fromZodError(e);
    error.message = errorMessage ?? error.message;
    throw error;
  }
};

// src/jsonWeb/jsonWebToken.ts
var defaultSchema = import_zod4.z.record(import_zod4.z.string().or(import_zod4.z.number()), import_zod4.z.unknown());
var jsonWebTokenSchema = ({
  claimsSchema = defaultSchema,
  headerSchema = defaultSchema
} = {
  claimsSchema: defaultSchema,
  headerSchema: defaultSchema
}) => import_zod4.z.string().transform((s, ctx) => {
  const [header, claims, signature] = s.split(".");
  if (!header) {
    ctx.addIssue({
      code: import_zod4.z.ZodIssueCode.custom,
      message: "JWT does not contain a header parameter"
    });
    return import_zod4.z.NEVER;
  }
  if (!claims) {
    ctx.addIssue({
      code: import_zod4.z.ZodIssueCode.custom,
      message: "JWT does not contain a payload"
    });
    return import_zod4.z.NEVER;
  }
  if (!signature) {
    ctx.addIssue({
      code: import_zod4.z.ZodIssueCode.custom,
      message: "JWT does not contain a signature"
    });
    return import_zod4.z.NEVER;
  }
  const decodedHeader = import_buffer.Buffer.from(header, "base64").toString();
  const decodedClaims = import_buffer.Buffer.from(claims, "base64").toString();
  const decodedSignature = import_buffer.Buffer.from(signature, "base64");
  const validatedHeader = validate({
    schema: headerSchema,
    data: JSON.parse(decodedHeader),
    errorMessage: "invalid header claims provided"
  });
  const validatedClaims = validate({
    schema: claimsSchema,
    data: JSON.parse(decodedClaims),
    errorMessage: "invalid payload claims provided"
  });
  return {
    jwt: s,
    header: validatedHeader,
    claims: validatedClaims,
    signature: new Uint8Array(decodedSignature)
  };
});

// src/jsonWeb/createJsonWebToken.ts
var import_buffer2 = require("buffer");

// src/utils/encoding.ts
function base64ToBase64URL(base64) {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function stringifyJwtPart(value) {
  return JSON.stringify(value, function(key, serialized) {
    const original = this[key];
    return original instanceof Date ? Math.floor(original.getTime() / 1e3) : serialized;
  });
}

// src/jsonWeb/createJsonWebToken.ts
var createJsonWebToken = (header, payload, signature) => {
  const encodedHeader = base64ToBase64URL(import_buffer2.Buffer.from(stringifyJwtPart(header)).toString("base64"));
  const encodedPayload = base64ToBase64URL(import_buffer2.Buffer.from(stringifyJwtPart(payload)).toString("base64"));
  const encodedSignature = base64ToBase64URL(import_buffer2.Buffer.from(signature).toString("base64"));
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
};

// src/jsonWeb/getUsedJsonWebKey.ts
var import_zod5 = require("zod");
var getUsedJsonWebKey = (header, claims) => {
  const validatedHeader = validate({
    schema: import_zod5.z.object({
      kid: import_zod5.z.string()
    }).passthrough(),
    data: header,
    errorMessage: "invalid header claims. Should contain a key id"
  });
  const validatedClaims = validate({
    schema: import_zod5.z.object({ jwks: jsonWebKeySetSchema }).passthrough(),
    data: claims,
    errorMessage: "Invalid payload claims. Should contain a json web key set"
  });
  const key = validatedClaims.jwks?.keys.find((key2) => key2.kid === validatedHeader.kid);
  if (!key) {
    throw new Error(`key with id: '${header.kid}' could not be found in the claims`);
  }
  return key;
};

// src/jsonWeb/createJsonWebTokenSignableInput.ts
var import_buffer3 = require("buffer");
var createJwtSignableInput = (header, payload) => {
  if (Object.keys(header).length === 0) {
    throw new Error("Can not create JWT with an empty header");
  }
  if (Object.keys(payload).length === 0) {
    throw new Error("Can not create JWT with an empty payload");
  }
  const encodedHeader = base64ToBase64URL(import_buffer3.Buffer.from(stringifyJwtPart(header)).toString("base64"));
  const encodedPayload = base64ToBase64URL(import_buffer3.Buffer.from(stringifyJwtPart(payload)).toString("base64"));
  const toBeSignedString = `${encodedHeader}.${encodedPayload}`;
  return new Uint8Array(import_buffer3.Buffer.from(toBeSignedString));
};

// src/metadata/metadata.ts
var import_zod21 = require("zod");

// src/metadata/entity/federationEntity.ts
var import_zod16 = require("zod");

// src/metadata/common.ts
var import_zod6 = require("zod");
var commonMetadataSchema = import_zod6.z.object({
  // -- 5.2.1 Extensions for JWK Sets in Entity Metadata
  signed_jwks_uri: import_zod6.z.string().url().optional(),
  jwks_uri: import_zod6.z.string().url().optional(),
  jwks: jsonWebKeySetSchema.optional(),
  // -- 5.2.2 informational Metadata Extensions --
  organization_name: import_zod6.z.string().optional(),
  contacts: import_zod6.z.array(import_zod6.z.string()).min(1).optional(),
  logo_uri: import_zod6.z.string().url().optional(),
  policy_uri: import_zod6.z.string().url().optional(),
  homepage_uri: import_zod6.z.string().url().optional()
});

// src/metadata/operator/MetadataMergeStrategy.ts
var MetadataMergeStrategy = /* @__PURE__ */ ((MetadataMergeStrategy2) => {
  MetadataMergeStrategy2[MetadataMergeStrategy2["OperatorValuesEqual"] = 0] = "OperatorValuesEqual";
  MetadataMergeStrategy2[MetadataMergeStrategy2["Union"] = 1] = "Union";
  MetadataMergeStrategy2[MetadataMergeStrategy2["Intersection"] = 2] = "Intersection";
  MetadataMergeStrategy2[MetadataMergeStrategy2["SuperiorFollowsIfTrue"] = 3] = "SuperiorFollowsIfTrue";
  return MetadataMergeStrategy2;
})(MetadataMergeStrategy || {});

// src/metadata/operator/MetadataOrderOfApplication.ts
var MetadataOrderOfApplication = /* @__PURE__ */ ((MetadataOrderOfApplication2) => {
  MetadataOrderOfApplication2[MetadataOrderOfApplication2["First"] = 0] = "First";
  MetadataOrderOfApplication2[MetadataOrderOfApplication2["AfterValue"] = 1] = "AfterValue";
  MetadataOrderOfApplication2[MetadataOrderOfApplication2["AfterAdd"] = 2] = "AfterAdd";
  MetadataOrderOfApplication2[MetadataOrderOfApplication2["AfterDefault"] = 3] = "AfterDefault";
  MetadataOrderOfApplication2[MetadataOrderOfApplication2["AfterOneOf"] = 4] = "AfterOneOf";
  MetadataOrderOfApplication2[MetadataOrderOfApplication2["AfterSubsetOf"] = 5] = "AfterSubsetOf";
  MetadataOrderOfApplication2[MetadataOrderOfApplication2["Last"] = 6] = "Last";
  return MetadataOrderOfApplication2;
})(MetadataOrderOfApplication || {});

// src/metadata/operator/utils/swapValidators.ts
var import_zod7 = require("zod");
var swapValidators = (schema, newValidator) => {
  return import_zod7.z.object(
    Object.keys(schema.shape).reduce(
      (acc, key) => {
        acc[key] = newValidator;
        return acc;
      },
      {}
    )
  );
};

// src/metadata/operator/utils/createPolicyOperatorSchema.ts
var createPolicyOperatorSchema = (operator) => ({
  /**
   * The key of the operator which is used to identify the operator
   */
  key: operator.key,
  /**
   * The merge strategy of the operator
   */
  mergeStrategy: operator.mergeStrategy,
  /**
   * The order of application of the operator
   */
  orderOfApplication: operator.orderOfApplication,
  /**
   * The operator itself
   */
  operator,
  /**
   * The schema for the operator itself so for essential it is only a boolean
   */
  operatorSchema: operator.operatorJsonValues.reduce((acc, schema) => acc.or(schema)).optional(),
  /**
   * The schema for the parameter the operator can be applied to so when the policy is targeting federation_entity we can check if the policy can handle that property
   */
  parameterSchema: operator.parameterJsonValues.reduce((acc, schema) => acc.or(schema)).optional()
});

// src/metadata/operator/standard/add.ts
var import_zod8 = require("zod");
var addOperator = createPolicyOperatorSchema({
  key: "add",
  parameterJsonValues: [
    import_zod8.z.array(import_zod8.z.string()),
    // TODO: See how we want to we handle the comparison of objects
    // z.array(z.record(z.string().or(z.number()), z.unknown())),
    import_zod8.z.array(import_zod8.z.number())
  ],
  operatorJsonValues: [
    import_zod8.z.array(import_zod8.z.string()),
    // TODO: See how we want to we handle the comparison of objects
    // z.array(z.record(z.string().or(z.number()), z.unknown())),
    import_zod8.z.array(import_zod8.z.number())
  ],
  canBeCombinedWith: ["default", "subset_of", "superset_of", "essential"],
  orderOfApplication: 1 /* AfterValue */,
  mergeStrategy: 1 /* Union */
});

// src/metadata/operator/standard/oneOf.ts
var import_zod9 = require("zod");
var oneOfOperator = createPolicyOperatorSchema({
  key: "one_of",
  parameterJsonValues: [
    import_zod9.z.string(),
    // TODO: See how we want to we handle the comparison of objects
    // z.record(z.string().or(z.number()), z.unknown()),
    import_zod9.z.number()
  ],
  operatorJsonValues: [
    import_zod9.z.array(import_zod9.z.string()),
    // TODO: See how we want to we handle the comparison of objects
    // z.array(z.record(z.string().or(z.number()), z.unknown())),
    import_zod9.z.array(import_zod9.z.number())
  ],
  canBeCombinedWith: ["default", "essential"],
  orderOfApplication: 3 /* AfterDefault */,
  mergeStrategy: 2 /* Intersection */
});

// src/metadata/operator/standard/value.ts
var import_zod10 = require("zod");
var valueOperator = createPolicyOperatorSchema({
  key: "value",
  parameterJsonValues: [
    import_zod10.z.string(),
    import_zod10.z.number(),
    import_zod10.z.boolean(),
    import_zod10.z.record(import_zod10.z.string().or(import_zod10.z.number()), import_zod10.z.unknown()),
    import_zod10.z.array(import_zod10.z.unknown())
  ],
  operatorJsonValues: [
    import_zod10.z.string(),
    import_zod10.z.number(),
    import_zod10.z.boolean(),
    import_zod10.z.record(import_zod10.z.string().or(import_zod10.z.number()), import_zod10.z.unknown()),
    import_zod10.z.array(import_zod10.z.unknown()),
    import_zod10.z.null()
  ],
  canBeCombinedWith: ["essential"],
  orderOfApplication: 0 /* First */,
  mergeStrategy: 0 /* OperatorValuesEqual */
});

// src/metadata/operator/standard/default.ts
var import_zod11 = require("zod");
var defaultOperator = createPolicyOperatorSchema({
  key: "default",
  parameterJsonValues: [
    import_zod11.z.string(),
    import_zod11.z.number(),
    import_zod11.z.boolean(),
    import_zod11.z.record(import_zod11.z.string().or(import_zod11.z.number()), import_zod11.z.unknown()),
    import_zod11.z.array(import_zod11.z.unknown())
  ],
  operatorJsonValues: [
    import_zod11.z.string(),
    import_zod11.z.number(),
    import_zod11.z.boolean(),
    import_zod11.z.record(import_zod11.z.string().or(import_zod11.z.number()), import_zod11.z.unknown()),
    import_zod11.z.array(import_zod11.z.unknown())
  ],
  canBeCombinedWith: ["add", "one_of", "subset_of", "superset_of", "essential"],
  orderOfApplication: 2 /* AfterAdd */,
  mergeStrategy: 0 /* OperatorValuesEqual */
});

// src/metadata/operator/standard/subsetOf.ts
var import_zod12 = require("zod");
var subsetOfOperator = createPolicyOperatorSchema({
  key: "subset_of",
  parameterJsonValues: [
    import_zod12.z.array(import_zod12.z.string()),
    // TODO: See how we want to we handle the comparison of objects
    // z.array(z.record(z.string().or(z.number()), z.unknown())),
    import_zod12.z.array(import_zod12.z.number())
  ],
  operatorJsonValues: [
    import_zod12.z.array(import_zod12.z.string()),
    // TODO: See how we want to we handle the comparison of objects
    // z.array(z.record(z.string().or(z.number()), z.unknown())),
    import_zod12.z.array(import_zod12.z.number())
  ],
  canBeCombinedWith: ["add", "default", "superset_of", "essential"],
  orderOfApplication: 4 /* AfterOneOf */,
  mergeStrategy: 2 /* Intersection */
});

// src/metadata/operator/standard/essential.ts
var import_zod13 = require("zod");
var essentialOperator = createPolicyOperatorSchema({
  key: "essential",
  parameterJsonValues: [
    import_zod13.z.string(),
    import_zod13.z.number(),
    import_zod13.z.boolean(),
    import_zod13.z.record(import_zod13.z.string().or(import_zod13.z.number())),
    import_zod13.z.unknown(),
    import_zod13.z.array(import_zod13.z.unknown())
  ],
  operatorJsonValues: [import_zod13.z.boolean()],
  canBeCombinedWith: ["add", "default", "one_of", "subset_of", "superset_of", "value"],
  orderOfApplication: 6 /* Last */,
  mergeStrategy: 3 /* SuperiorFollowsIfTrue */
});

// src/metadata/operator/standard/supersetOf.ts
var import_zod14 = require("zod");
var supersetOfOperator = createPolicyOperatorSchema({
  key: "superset_of",
  parameterJsonValues: [
    import_zod14.z.array(import_zod14.z.string()),
    // TODO: See how we want to we handle the comparison of objects
    // z.array(z.record(z.string().or(z.number()), z.unknown())),
    import_zod14.z.array(import_zod14.z.number())
  ],
  operatorJsonValues: [
    import_zod14.z.array(import_zod14.z.string()),
    // TODO: See how we want to we handle the comparison of objects
    // z.array(z.record(z.string().or(z.number()), z.unknown())),
    import_zod14.z.array(import_zod14.z.number())
  ],
  canBeCombinedWith: ["add", "default", "subset_of", "essential"],
  orderOfApplication: 5 /* AfterSubsetOf */,
  mergeStrategy: 1 /* Union */
});

// src/metadata/policy.ts
var import_zod15 = require("zod");
var allSupportedPolicies = {
  [addOperator.key]: addOperator,
  [defaultOperator.key]: defaultOperator,
  [essentialOperator.key]: essentialOperator,
  [oneOfOperator.key]: oneOfOperator,
  [subsetOfOperator.key]: subsetOfOperator,
  [supersetOfOperator.key]: supersetOfOperator,
  [valueOperator.key]: valueOperator
};
var isExistingPolicyKey = (key) => key in allSupportedPolicies;
var metadataPolicySchema = import_zod15.z.object(
  Object.entries(allSupportedPolicies).reduce(
    // biome-ignore lint/performance/noAccumulatingSpread: In this case we want to use the spread operator
    (acc, [key, policy]) => ({ ...acc, [key]: policy.operatorSchema }),
    {}
  )
).and(import_zod15.z.record(import_zod15.z.string(), import_zod15.z.any())).superRefine((data, ctx) => {
  const dataKeys = Object.keys(data);
  for (const dataKey of dataKeys) {
    if (!isExistingPolicyKey(dataKey)) continue;
    const { operator } = allSupportedPolicies[dataKey];
    if (dataKeys.some((key) => key !== operator.key && !operator.canBeCombinedWith.includes(key))) {
      ctx.addIssue({
        code: import_zod15.z.ZodIssueCode.custom,
        message: `policy operator '${operator.key}' can only be combined with one of: [${operator.canBeCombinedWith.join(
          ", "
        )}]. keys: [${Object.keys(data).join(",")}]`
      });
    }
  }
  return data;
});

// src/metadata/entity/utils/createEntity.ts
var createEntity = ({
  identifier,
  additionalValidation = {},
  passThroughUnknownProperties = true
}) => {
  const schema = commonMetadataSchema.extend(additionalValidation);
  return {
    identifier,
    schema: passThroughUnknownProperties ? schema.passthrough() : schema,
    policySchema: swapValidators(schema, metadataPolicySchema.optional())
  };
};

// src/metadata/entity/federationEntity.ts
var federationEntityMetadata = createEntity({
  identifier: "federation_entity",
  additionalValidation: {
    federation_fetch_endpoint: import_zod16.z.string().url().optional(),
    federation_list_endpoint: import_zod16.z.string().url().optional(),
    federation_resolve_endpoint: import_zod16.z.string().url().optional(),
    federation_trust_mark_status_endpoint: import_zod16.z.string().url().optional(),
    federation_trust_mark_list_endpoint: import_zod16.z.string().url().optional(),
    federation_trust_mark_endpoint: import_zod16.z.string().url().optional(),
    federation_historical_keys_endpoint: import_zod16.z.string().url().optional()
  }
});

// src/metadata/entity/oauthClient.ts
var oauthClientEntityMetadata = createEntity({ identifier: "oauth_client" });

// src/metadata/entity/oauthResource.ts
var oauthResourceEntityMetadata = createEntity({
  identifier: "oauth_resource"
});

// src/metadata/entity/openIdProvider.ts
var import_zod17 = require("zod");
var openIdProviderEntityMetadata = createEntity({
  identifier: "openid_provider",
  passThroughUnknownProperties: true,
  additionalValidation: {
    client_registration_types_supported: import_zod17.z.array(import_zod17.z.string()).optional(),
    federation_registration_endpoint: import_zod17.z.string().url().optional(),
    request_authentication_methods_supported: import_zod17.z.object({
      authorization_endpoint: import_zod17.z.array(import_zod17.z.string()).optional(),
      pushed_authorization_request_endpoint: import_zod17.z.array(import_zod17.z.string()).optional()
    }).optional(),
    request_authentication_signing_alg_values_supported: import_zod17.z.array(import_zod17.z.string()).optional()
  }
});

// src/metadata/entity/openIdRelyingParty.ts
var import_zod18 = require("zod");
var openidRelyingPartyEntityMetadata = createEntity({
  identifier: "openid_relying_party",
  passThroughUnknownProperties: true,
  additionalValidation: {
    client_registration_types: import_zod18.z.array(import_zod18.z.string()).optional()
  }
});

// src/metadata/entity/oauthAuthorizationServer.ts
var oauthAuthorizationServerEntityMetadata = createEntity({
  identifier: "oauth_authorization_server"
});

// src/metadata/entity/openIdCredentialIssuer.ts
var import_zod19 = require("zod");
var openIdCredentialIssuerEntityMetadata = createEntity({
  identifier: "openid_credential_issuer",
  passThroughUnknownProperties: true,
  additionalValidation: {
    client_registration_types_supported: import_zod19.z.array(import_zod19.z.string()).optional(),
    federation_registration_endpoint: import_zod19.z.string().url().optional(),
    request_authentication_methods_supported: import_zod19.z.object({
      authorization_endpoint: import_zod19.z.array(import_zod19.z.string()).optional(),
      pushed_authorization_request_endpoint: import_zod19.z.array(import_zod19.z.string()).optional()
    }).optional(),
    request_authentication_signing_alg_values_supported: import_zod19.z.array(import_zod19.z.string()).optional()
  }
});

// src/metadata/entity/openIdCredentialVerifier.ts
var import_zod20 = require("zod");
var openidCredentialVerifierEntityMetadata = createEntity({
  identifier: "openid_credential_verifier",
  passThroughUnknownProperties: true,
  additionalValidation: {
    client_registration_types: import_zod20.z.array(import_zod20.z.string()).optional()
  }
});

// src/metadata/metadata.ts
var metadataSchema = import_zod21.z.object({
  [federationEntityMetadata.identifier]: federationEntityMetadata.schema.optional(),
  [openidRelyingPartyEntityMetadata.identifier]: openidRelyingPartyEntityMetadata.schema.optional(),
  [openidCredentialVerifierEntityMetadata.identifier]: openidCredentialVerifierEntityMetadata.schema.optional(),
  [openIdCredentialIssuerEntityMetadata.identifier]: openIdCredentialIssuerEntityMetadata.schema.optional(),
  [openIdProviderEntityMetadata.identifier]: openIdProviderEntityMetadata.schema.optional(),
  [oauthAuthorizationServerEntityMetadata.identifier]: oauthAuthorizationServerEntityMetadata.schema.optional(),
  [oauthClientEntityMetadata.identifier]: oauthClientEntityMetadata.schema.optional(),
  [oauthResourceEntityMetadata.identifier]: oauthResourceEntityMetadata.schema.optional()
}).passthrough();

// src/trustMark/trustMark.ts
var import_zod23 = require("zod");

// src/utils/dateSchema.ts
var import_zod22 = require("zod");
var dateSchema = import_zod22.z.union([import_zod22.z.date(), import_zod22.z.number(), import_zod22.z.string().transform((x) => x.includes("T") ? new Date(x) : Number(x))]).transform((d) => d instanceof Date ? d : new Date(d * 1e3));

// src/utils/url.ts
var addPaths = (baseUrl, ...paths) => {
  const [scheme, rest] = baseUrl.split("://");
  if (!rest) {
    throw new OpenIdFederationError("validation" /* Validation */, "not a valid URL");
  }
  const urlWithoutScheme = rest.split("/").concat(...paths.map((p) => p.split("/"))).filter((s) => s.length > 0).join("/");
  return `${scheme}://${urlWithoutScheme}`;
};
var addSearchParams = (baseUrl, searchParams) => baseUrl.endsWith("?") ? `${baseUrl}${searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams)}` : `${baseUrl}?${searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams)}`;
var isSameEntityId = (a, b) => a === b;

// src/utils/fetch.ts
var hasMediaType = (contentType, mediaType) => contentType?.split(";")[0]?.trim().toLowerCase() === mediaType.toLowerCase();
var get = async ({
  url,
  searchParams,
  responseValidationSchema,
  requiredContentType,
  fetchCallback = global.fetch
}) => {
  const urlSearchParams = new URLSearchParams(searchParams);
  const urlWithSearchParams = urlSearchParams.size > 0 ? addSearchParams(url, urlSearchParams) : url;
  const response = await fetchCallback(urlWithSearchParams, {
    method: "GET"
  });
  if (!response.ok) {
    throw new Error(`request to '${urlWithSearchParams}' failed with status ${response.status}`);
  }
  if (requiredContentType && !hasMediaType(response.headers.get("content-type"), requiredContentType)) {
    throw new Error(
      `received content-type '${response.headers.get(
        "content-type"
      )}' does not equal expected content-type '${requiredContentType}'`
    );
  }
  if (responseValidationSchema) {
    const json = await response.json();
    return validate({
      data: json,
      schema: responseValidationSchema,
      errorMessage: "invalid response from the GET call"
    });
  }
  const text = await response.text();
  return text;
};
var post = async ({
  url,
  body,
  responseValidationSchema,
  fetchCallback = global.fetch
}) => {
  const response = await fetchCallback(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : void 0,
    headers: { "Content-Type": "application/json" }
  });
  if (responseValidationSchema) {
    const json = await response.json();
    return validate({
      data: json,
      schema: responseValidationSchema,
      errorMessage: "invalid response from a POST call"
    });
  }
  const text = await response.text();
  return text;
};
var fetcher = {
  get,
  post
};

// src/trustMark/trustMark.ts
var withTrustMarkType = (value, ctx) => {
  const trustMarkType = value.trust_mark_type ?? value.id;
  if (!trustMarkType) {
    ctx.addIssue({
      code: import_zod23.z.ZodIssueCode.custom,
      message: "trust_mark_type is required",
      path: ["trust_mark_type"]
    });
    return import_zod23.z.NEVER;
  }
  return { ...value, trust_mark_type: trustMarkType };
};
var trustMarkClaimsSchema = import_zod23.z.object({
  iss: import_zod23.z.string(),
  sub: import_zod23.z.string(),
  trust_mark_type: import_zod23.z.string().optional(),
  /**
   * @deprecated replaced by `trust_mark_type` in OpenID Federation 1.0
   */
  id: import_zod23.z.string().optional(),
  iat: dateSchema,
  exp: dateSchema.optional(),
  logo_uri: import_zod23.z.string().url().optional(),
  ref: import_zod23.z.string().url().optional(),
  delegation: import_zod23.z.string().optional()
}).passthrough().transform(withTrustMarkType);
var trustMarkSchema = import_zod23.z.object({
  trust_mark_type: import_zod23.z.string().optional(),
  /**
   * @deprecated replaced by `trust_mark_type` in OpenID Federation 1.0
   */
  id: import_zod23.z.string().optional(),
  trust_mark: jsonWebTokenSchema({
    claimsSchema: trustMarkClaimsSchema
  })
}).transform(withTrustMarkType).refine((entry) => entry.trust_mark_type === entry.trust_mark.claims.trust_mark_type, {
  message: "trust_mark_type must be the trust_mark_type of the trust mark JWT",
  path: ["trust_mark_type"]
});

// src/trustMark/trustMarkOwner.ts
var import_zod24 = require("zod");
var trustMarkOwnerSchema = import_zod24.z.record(
  import_zod24.z.string(),
  import_zod24.z.object({
    sub: import_zod24.z.string(),
    jwks: jsonWebKeySetSchema
  })
);

// src/trustMark/trustMarkIssuer.ts
var import_zod25 = require("zod");
var trustMarkIssuerSchema = import_zod25.z.record(import_zod25.z.string(), import_zod25.z.array(import_zod25.z.string()));

// src/entityStatement/entityStatementClaims.ts
var import_zod26 = require("zod");
var entityStatementClaimsSchema = import_zod26.z.object({
  iss: import_zod26.z.string(),
  sub: import_zod26.z.string(),
  iat: dateSchema,
  exp: dateSchema,
  jwks: jsonWebKeySetSchema,
  authority_hints: import_zod26.z.array(import_zod26.z.string().url()).optional(),
  metadata: metadataSchema.optional(),
  metadata_policy: import_zod26.z.record(import_zod26.z.record(metadataPolicySchema.optional())).optional(),
  constraints: constraintSchema.optional(),
  crit: import_zod26.z.array(import_zod26.z.string()).optional(),
  metadata_policy_crit: import_zod26.z.array(import_zod26.z.string()).optional(),
  trust_marks: import_zod26.z.array(trustMarkSchema).optional(),
  trust_mark_issuers: trustMarkIssuerSchema.optional(),
  trust_mark_owners: trustMarkOwnerSchema.optional(),
  source_endpoint: import_zod26.z.string().url().optional()
}).superRefine((data, ctx) => {
  const keyIds = data.jwks.keys.map((key) => key.kid);
  if (keyIds.some((key, i) => keyIds.indexOf(key) !== i)) {
    ctx.addIssue({
      code: "custom",
      message: "keys include duplicate key ids",
      path: ["jwks", "keys"]
    });
  }
  return data;
});

// src/entityStatement/entityStatementHeader.ts
var import_zod27 = require("zod");
var entityStatementHeaderSchema = import_zod27.z.object({
  kid: import_zod27.z.string(),
  typ: import_zod27.z.literal("entity-statement+jwt")
}).passthrough();

// src/entityStatement/createEntityStatement.ts
var createEntityStatement = async ({
  signJwtCallback,
  claims,
  jwk,
  header = {
    typ: "entity-statement+jwt",
    kid: jwk.kid
  }
}) => {
  if (header.kid !== jwk.kid) {
    throw new Error(`key id in the header: '${header.kid}' does not match the key id in the JWK: '${jwk.kid}'`);
  }
  validate({
    schema: entityStatementHeaderSchema,
    data: header,
    errorMessage: "invalid header claims provided"
  });
  validate({
    schema: entityStatementClaimsSchema,
    data: claims,
    errorMessage: "invalid payload claims provided"
  });
  const toBeSigned = createJwtSignableInput(header, claims);
  const signature = await signJwtCallback({ toBeSigned, jwk });
  return createJsonWebToken(header, claims, signature);
};

// src/jsonWeb/parseJsonWebToken.ts
var import_buffer4 = require("buffer");
var parseJsonWebToken = (jwt) => {
  const [encodedHeader, encodedClaims, encodedSignature] = jwt.split(".");
  if (!encodedHeader) {
    throw new Error("could not find the header in the JWT");
  }
  if (!encodedClaims) {
    throw new Error("could not find the claims in the JWT");
  }
  if (!encodedSignature) {
    throw new Error("could not find the signature in the JWT");
  }
  const header = JSON.parse(import_buffer4.Buffer.from(encodedHeader, "base64").toString());
  const claims = JSON.parse(import_buffer4.Buffer.from(encodedClaims, "base64").toString());
  const signature = new Uint8Array(import_buffer4.Buffer.from(encodedSignature, "base64"));
  return {
    header,
    claims,
    signature,
    signableInput: new Uint8Array(import_buffer4.Buffer.from(`${encodedHeader}.${encodedClaims}`))
  };
};

// src/jsonWeb/verifyJsonWebToken.ts
var verifyJwtSignature = async ({ jwt, jwks, verifyJwtCallback }) => {
  const { header, signature, claims, signableInput } = parseJsonWebToken(jwt);
  const jsonWebKeySetClaims = jwks ? { jwks } : claims;
  const jwk = getUsedJsonWebKey(header, jsonWebKeySetClaims);
  try {
    const isValid = await verifyJwtCallback({
      jwt,
      header,
      claims,
      signature,
      jwk,
      data: signableInput
    });
    if (!isValid) {
      throw new Error("Signature in the JWT is invalid");
    }
  } catch (e) {
    if (typeof e === "string") {
      throw new Error(e);
    }
    throw e;
  }
};

// src/entityStatement/entityStatementJwt.ts
var entityStatementJwtSchema = jsonWebTokenSchema({
  headerSchema: entityStatementHeaderSchema,
  claimsSchema: entityStatementClaimsSchema
});

// src/entityStatement/fetchEntityStatement.ts
var fetchEntityStatement = async ({
  sub,
  verifyJwtCallback,
  iss,
  endpoint,
  issEntityConfiguration,
  fetchCallback
}) => {
  const issEntityConfigurationClaims = issEntityConfiguration ?? await fetchEntityConfiguration({ entityId: iss, verifyJwtCallback, fetchCallback });
  const fetchEndpoint = endpoint ?? issEntityConfigurationClaims.metadata?.federation_entity?.federation_fetch_endpoint;
  if (!fetchEndpoint) {
    throw new Error("No fetch endpoint provided or in the issuer configuration");
  }
  const entityStatementJwt = await fetcher.get({
    url: fetchEndpoint,
    searchParams: { sub },
    requiredContentType: "application/entity-statement+jwt",
    fetchCallback
  });
  const { claims } = validate({
    schema: entityStatementJwtSchema,
    data: entityStatementJwt,
    errorMessage: "fetched entity statement JWT is invalid"
  });
  if (!isSameEntityId(claims.iss, iss) || !isSameEntityId(claims.sub, sub)) {
    throw new OpenIdFederationError(
      "validation" /* Validation */,
      `entity statement fetched for issuer '${iss}' and subject '${sub}' has issuer '${claims.iss}' and subject '${claims.sub}'`
    );
  }
  await verifyJwtSignature({
    verifyJwtCallback,
    jwt: entityStatementJwt,
    jwks: issEntityConfigurationClaims.jwks
  });
  return claims;
};

// src/entityStatement/fetchEntityStatementChain.ts
var fetchEntityStatementChain = async ({
  verifyJwtCallback,
  entityConfigurations,
  fetchCallback
}) => {
  if (entityConfigurations.length === 0) {
    throw new OpenIdFederationError(
      "validation" /* Validation */,
      "Cannot establish a statement chain for zero entity configurations"
    );
  }
  const reversedConfigurations = [...entityConfigurations].reverse();
  const promises = [];
  for (let i = 0; i < reversedConfigurations.length; i++) {
    const configuration = reversedConfigurations[i];
    const subjectConfiguration = reversedConfigurations[i + 1];
    if (!subjectConfiguration) continue;
    const fetchEndpoint = configuration?.metadata?.federation_entity?.federation_fetch_endpoint;
    if (!fetchEndpoint) {
      throw new OpenIdFederationError(
        "validation" /* Validation */,
        `No fetch endpoint found for configuration for: '${configuration?.sub}'`
      );
    }
    promises.push(
      fetchEntityStatement({
        verifyJwtCallback,
        endpoint: fetchEndpoint,
        iss: configuration.iss,
        sub: subjectConfiguration.sub,
        issEntityConfiguration: configuration,
        fetchCallback
      })
    );
  }
  const trustAnchorEntityConfiguration = entityConfigurations[entityConfigurations.length - 1];
  if (!trustAnchorEntityConfiguration) {
    throw new OpenIdFederationError("validation" /* Validation */, "No trust anchor entity configuration found");
  }
  return [trustAnchorEntityConfiguration, ...await Promise.all(promises)].reverse();
};

// src/entityConfiguration/entityConfigurationClaims.ts
var entityConfigurationClaimsSchema = entityStatementClaimsSchema.refine((data) => data.iss === data.sub, {
  message: "iss and sub must be equal",
  path: ["iss", "sub"]
});

// src/entityConfiguration/entityConfigurationHeader.ts
var import_zod28 = require("zod");
var entityConfigurationHeaderSchema = import_zod28.z.object({
  kid: import_zod28.z.string(),
  typ: import_zod28.z.literal("entity-statement+jwt")
}).passthrough();

// src/entityConfiguration/entityConfigurationJwt.ts
var entityConfigurationJwtSchema = jsonWebTokenSchema({
  headerSchema: entityConfigurationHeaderSchema,
  claimsSchema: entityConfigurationClaimsSchema
});

// src/entityConfiguration/fetchEntityConfiguration.ts
var fetchEntityConfiguration = async ({
  entityId,
  verifyJwtCallback,
  fetchCallback
}) => {
  const federationUrl = addPaths(entityId, ".well-known", "openid-federation");
  const entityConfigurationJwt = await fetcher.get({
    url: federationUrl,
    requiredContentType: "application/entity-statement+jwt",
    fetchCallback
  });
  const { claims } = validate({
    schema: entityConfigurationJwtSchema,
    data: entityConfigurationJwt,
    errorMessage: "fetched entity configuration JWT is invalid"
  });
  if (!isSameEntityId(claims.sub, entityId)) {
    throw new OpenIdFederationError(
      "validation" /* Validation */,
      `entity configuration fetched for '${entityId}' has subject '${claims.sub}'`
    );
  }
  await verifyJwtSignature({ jwt: entityConfigurationJwt, verifyJwtCallback });
  return claims;
};

// src/entityConfiguration/fetchEntityConfigurationChains.ts
var fetchEntityConfigurationChains = async (options) => {
  if (options.trustAnchorEntityIds.length === 0) {
    throw new OpenIdFederationError(
      "validation" /* Validation */,
      "Cannot establish a configuration chain for zero trust anchors"
    );
  }
  const __fetchEntityConfigurationChains = async (currentEntityId, path = []) => {
    const configuration = await fetchEntityConfiguration({
      verifyJwtCallback: options.verifyJwtCallback,
      fetchCallback: options.fetchCallback,
      entityId: currentEntityId
    });
    const localPath = [...path, configuration];
    const allPaths = [];
    if (options.trustAnchorEntityIds.includes(configuration.sub)) {
      allPaths.push(localPath);
    }
    if (configuration.authority_hints) {
      const promises = [];
      for (const superior of configuration.authority_hints) {
        if (localPath.map((v) => v.sub).includes(superior)) continue;
        promises.push(__fetchEntityConfigurationChains(superior, localPath));
      }
      const results = await Promise.allSettled(promises);
      for (const res of results) {
        if (res.status === "fulfilled") {
          allPaths.push(...res.value);
        }
      }
    }
    return allPaths;
  };
  return __fetchEntityConfigurationChains(options.leafEntityId);
};

// src/entityConfiguration/createEntityConfiguration.ts
var createEntityConfiguration = async ({
  header,
  signJwtCallback,
  claims
}) => {
  const validatedHeader = validate({
    schema: entityConfigurationHeaderSchema,
    data: header,
    errorMessage: "invalid header claims provided"
  });
  const validatedClaims = validate({
    data: claims,
    schema: entityConfigurationClaimsSchema,
    errorMessage: "invalid payload claims provided"
  });
  const toBeSigned = createJwtSignableInput(header, claims);
  const jwk = getUsedJsonWebKey(validatedHeader, validatedClaims);
  const signature = await signJwtCallback({ toBeSigned, jwk });
  return createJsonWebToken(header, claims, signature);
};

// src/utils/data.ts
function objectToEntries(obj) {
  return Object.entries(obj);
}
var isNullOrUndefined = (value) => value === null || value === void 0;
var immutable = (obj) => new Proxy(obj, {
  get(target, prop) {
    const value = target[prop];
    return typeof value === "object" && value !== null ? Array.isArray(value) ? Object.freeze(
      [...value].map((item) => typeof item === "object" && item !== null ? immutable(item) : item)
    ) : immutable(value) : value;
  },
  set() {
    throw new Error("This object is immutable.");
  },
  deleteProperty() {
    throw new Error("This object is immutable.");
  }
});

// src/resolveTrustChains/policies/MetadataHelper.ts
var MetadataHelper = class {
  constructor(leafMetadata) {
    this.leafMetadata = leafMetadata;
  }
  hasProperty(service, property) {
    return this.leafMetadata[service]?.[property] !== void 0;
  }
  getPropertyValue(service, property) {
    const serviceBlock = this.leafMetadata[service];
    if (serviceBlock === void 0) return void 0;
    const propertyValue = serviceBlock[property];
    if (propertyValue === void 0) return void 0;
    return propertyValue;
  }
  setPropertyValue(service, property, value) {
    this.leafMetadata = {
      ...this.leafMetadata,
      [service]: {
        ...this.leafMetadata[service],
        // optionally add a helper method to get a value or an empty object otherwise
        [property]: value
      }
    };
  }
  deleteProperty(service, property) {
    const serviceBlock = this.leafMetadata[service];
    if (serviceBlock === void 0) return;
    this.leafMetadata = {
      ...this.leafMetadata,
      [service]: {
        ...this.leafMetadata[service]
      }
    };
    delete this.leafMetadata[service][property];
    if (Object.keys(serviceBlock).length === 0) {
      delete this.leafMetadata[service];
    }
  }
  asMetadata() {
    return this.leafMetadata;
  }
  asMetadataPolicy() {
    return this.leafMetadata;
  }
};

// src/resolveTrustChains/policies/errors/PolicyMergeError.ts
var PolicyOperatorMergeError = class extends Error {
  constructor(message, details) {
    super(message);
    this.name = "PolicyOperatorMergeError";
    this.details = details;
  }
};

// src/resolveTrustChains/policies/errors/PolicyValidationError.ts
var PolicyValidationError = class extends Error {
  constructor(message, details) {
    super(message);
    this.name = "PolicyValidationError";
    this.details = details;
  }
};

// src/resolveTrustChains/policies/utils.ts
function intersect(operator1, operator2) {
  const set1 = new Set(operator1);
  const set2 = new Set(operator2);
  const intersection = [...set1].filter((value) => set2.has(value));
  return intersection;
}
function union(operator1, operator2) {
  return [.../* @__PURE__ */ new Set([...operator1, ...operator2])];
}
function mergeMetadata(leafConfigMetadata, superiorEntityStatement) {
  const mergedLeafMetadata = new MetadataHelper(immutable(leafConfigMetadata));
  for (const [entityType, entityConfigMetadata] of objectToEntries(superiorEntityStatement)) {
    for (const [key, value] of objectToEntries(entityConfigMetadata ?? {})) {
      mergedLeafMetadata.setPropertyValue(String(entityType), String(key), value);
    }
  }
  return mergedLeafMetadata.asMetadata();
}

// src/resolveTrustChains/policies/combineExistingMetadataPolicyOperators.ts
function combineExistingMetadataPolicyOperators({
  contextPath,
  existingPolicyRules,
  newPolicyRules
}) {
  const combinedPolicyRules = { ...existingPolicyRules };
  for (const [policyPropertyKey, policyRuleValue] of objectToEntries(newPolicyRules)) {
    if (!isExistingPolicyKey(policyPropertyKey)) continue;
    if (!combinedPolicyRules[policyPropertyKey]) {
      combinedPolicyRules[policyPropertyKey] = policyRuleValue;
      continue;
    }
    const existingPolicyRuleValue = combinedPolicyRules[policyPropertyKey];
    const operator = allSupportedPolicies[policyPropertyKey];
    const operatorInputResult = operator.operatorSchema.safeParse(policyRuleValue);
    if (!operatorInputResult.success) throw operatorInputResult.error;
    const newPolicyRuleValue = operatorInputResult.data;
    switch (operator.mergeStrategy) {
      case 0 /* OperatorValuesEqual */:
        if (Array.isArray(existingPolicyRuleValue) && Array.isArray(newPolicyRuleValue)) {
          if (existingPolicyRuleValue.length !== newPolicyRuleValue.length)
            throw new PolicyOperatorMergeError("Policy rule values are not equal", {
              path: contextPath,
              operatorA: existingPolicyRules,
              operatorB: newPolicyRules
            });
          if (existingPolicyRuleValue.some((value, i) => value !== newPolicyRuleValue[i]))
            throw new PolicyOperatorMergeError("Policy rule values are not equal", {
              path: contextPath,
              operatorA: existingPolicyRules,
              operatorB: newPolicyRules
            });
        } else if (existingPolicyRuleValue !== newPolicyRuleValue) {
          throw new PolicyOperatorMergeError("Policy rule values are not equal", {
            path: contextPath,
            operatorA: existingPolicyRules,
            operatorB: newPolicyRules
          });
        }
        break;
      case 1 /* Union */:
        if (!Array.isArray(existingPolicyRuleValue) || !Array.isArray(newPolicyRuleValue)) {
          throw new PolicyOperatorMergeError("Operator values are not an array", {
            path: contextPath,
            operatorA: existingPolicyRules,
            operatorB: newPolicyRules
          });
        }
        combinedPolicyRules[policyPropertyKey] = union(existingPolicyRuleValue, newPolicyRuleValue);
        break;
      case 2 /* Intersection */: {
        if (!Array.isArray(existingPolicyRuleValue) || !Array.isArray(newPolicyRuleValue)) {
          throw new PolicyOperatorMergeError("Existing policy rule value is not an array", {
            path: contextPath,
            operatorA: existingPolicyRules,
            operatorB: newPolicyRules
          });
        }
        const intersection = intersect(existingPolicyRuleValue, newPolicyRuleValue);
        if (intersection.length === 0) {
          throw new PolicyOperatorMergeError("Intersection is empty", {
            path: contextPath,
            operatorA: existingPolicyRules,
            operatorB: newPolicyRules
          });
        }
        combinedPolicyRules[policyPropertyKey] = intersection;
        break;
      }
      case 3 /* SuperiorFollowsIfTrue */:
        if (typeof existingPolicyRuleValue !== "boolean" || typeof newPolicyRuleValue !== "boolean") {
          throw new PolicyOperatorMergeError("Existing policy rule value is not a boolean", {
            path: contextPath,
            operatorA: existingPolicyRules,
            operatorB: newPolicyRules
          });
        }
        combinedPolicyRules[policyPropertyKey] = existingPolicyRuleValue ?? newPolicyRuleValue;
        break;
      default:
        throw new PolicyOperatorMergeError(`Unknown merge strategy: ${operator.mergeStrategy}`, {
          path: contextPath,
          operatorA: existingPolicyRules,
          operatorB: newPolicyRules
        });
    }
  }
  return combinedPolicyRules;
}

// src/resolveTrustChains/policies/combineMetadataPolicies.ts
function combineMetadataPolicies({
  statements
}) {
  if (statements.length === 0) throw new OpenIdFederationError("generic" /* Generic */, "Chain is empty");
  const mergedPolicyMap = new MetadataHelper({});
  for (let i = statements.length - 1; i >= 0; i--) {
    const entityStatement = statements[i];
    if (!entityStatement) continue;
    if (!entityStatement.metadata_policy) continue;
    const metadataPolicyCrit = entityStatement.metadata_policy_crit;
    for (const [serviceKey, serviceProperties] of objectToEntries(entityStatement.metadata_policy)) {
      for (const [servicePropertyKey, newPolicyRules] of objectToEntries(serviceProperties)) {
        if (newPolicyRules === void 0) continue;
        const contextPath = `${serviceKey}.${servicePropertyKey}`;
        if (metadataPolicyCrit) {
          const methodsToCheck = Object.keys(newPolicyRules);
          const unsupportedMethodsAndRequired = methodsToCheck.filter(
            (method) => !isExistingPolicyKey(method) && metadataPolicyCrit.includes(method)
          );
          if (unsupportedMethodsAndRequired.length > 0) {
            throw new OpenIdFederationError(
              "metadataPolicyCrit" /* MetadataPolicyCrit */,
              `Unsupported policy method and is required by the metadata_policy_crit: ${unsupportedMethodsAndRequired.join(", ")}`
            );
          }
        }
        const existingPolicyRule = mergedPolicyMap.getPropertyValue(serviceKey, servicePropertyKey);
        if (!existingPolicyRule) {
          mergedPolicyMap.setPropertyValue(serviceKey, servicePropertyKey, newPolicyRules);
          continue;
        }
        const combinedPolicyRulesRaw = combineExistingMetadataPolicyOperators({
          contextPath,
          existingPolicyRules: existingPolicyRule,
          newPolicyRules
        });
        const combinedPolicyRules = metadataPolicySchema.safeParse(combinedPolicyRulesRaw);
        if (!combinedPolicyRules.success) throw combinedPolicyRules.error;
        mergedPolicyMap.setPropertyValue(serviceKey, servicePropertyKey, combinedPolicyRules.data);
      }
    }
  }
  return {
    mergedPolicy: mergedPolicyMap.asMetadataPolicy()
  };
}

// src/resolveTrustChains/policies/applyMetadataPolicyToMetadata.ts
function applyMetadataPolicyToMetadata({
  leafMetadata,
  policyMetadata
}) {
  const resolvedLeafMetadata = new MetadataHelper(immutable(leafMetadata));
  for (const [serviceKey, service] of objectToEntries(policyMetadata)) {
    for (const [servicePropertyKey, policyValue] of objectToEntries(service)) {
      const policies = objectToEntries(policyValue).filter(([key]) => isExistingPolicyKey(key)).sort(
        ([policyKeyA], [policyKeyB]) => allSupportedPolicies[policyKeyA].orderOfApplication - allSupportedPolicies[policyKeyB].orderOfApplication
      );
      const path = `${serviceKey}.${servicePropertyKey}`;
      for (const [policyPropertyKey, valueFromPolicy] of policies) {
        switch (policyPropertyKey) {
          case "value":
            if (valueFromPolicy === null) {
              resolvedLeafMetadata.deleteProperty(serviceKey, servicePropertyKey);
              break;
            }
            resolvedLeafMetadata.setPropertyValue(serviceKey, servicePropertyKey, valueFromPolicy);
            break;
          case "add": {
            const targetValue = resolvedLeafMetadata.getPropertyValue(serviceKey, servicePropertyKey) ?? [];
            if (!Array.isArray(targetValue))
              throw new PolicyValidationError("Cannot apply add policy because the target is not an array", {
                path,
                policyValue: valueFromPolicy,
                targetValue
              });
            const newValue = union(targetValue, valueFromPolicy);
            resolvedLeafMetadata.setPropertyValue(serviceKey, servicePropertyKey, newValue);
            break;
          }
          case "one_of": {
            const targetValue = resolvedLeafMetadata.getPropertyValue(serviceKey, servicePropertyKey);
            if (isNullOrUndefined(targetValue)) break;
            if (!Array.isArray(valueFromPolicy))
              throw new PolicyValidationError("Cannot apply one_of policy because the value is not an array", {
                path,
                policyValue: valueFromPolicy,
                targetValue
              });
            if (!valueFromPolicy.some((value) => value === targetValue))
              throw new PolicyValidationError("Cannot apply one_of policy because the intersection is empty", {
                path,
                policyValue: valueFromPolicy,
                targetValue
              });
            break;
          }
          case "default":
            if (resolvedLeafMetadata.hasProperty(serviceKey, servicePropertyKey)) continue;
            resolvedLeafMetadata.setPropertyValue(serviceKey, servicePropertyKey, valueFromPolicy);
            break;
          case "subset_of": {
            const targetValue = resolvedLeafMetadata.getPropertyValue(serviceKey, servicePropertyKey);
            if (!Array.isArray(targetValue))
              throw new PolicyValidationError("Cannot apply subset_of policy because the target is not an array", {
                path,
                policyValue: valueFromPolicy,
                targetValue
              });
            if (!Array.isArray(valueFromPolicy))
              throw new PolicyValidationError("Cannot apply subset_of policy because the value is not an array", {
                path,
                policyValue: valueFromPolicy,
                targetValue
              });
            const newValue = targetValue.filter((value) => valueFromPolicy.includes(value));
            if (newValue.length === 0) {
              resolvedLeafMetadata.deleteProperty(serviceKey, servicePropertyKey);
              break;
            }
            resolvedLeafMetadata.setPropertyValue(serviceKey, servicePropertyKey, newValue);
            break;
          }
          case "superset_of": {
            const targetValue = resolvedLeafMetadata.getPropertyValue(serviceKey, servicePropertyKey);
            if (!Array.isArray(targetValue))
              throw new PolicyValidationError("Cannot apply superset_of policy because the target is not an array", {
                path,
                policyValue: valueFromPolicy,
                targetValue
              });
            if (!Array.isArray(valueFromPolicy))
              throw new PolicyValidationError("Cannot apply superset_of policy because the value is not an array", {
                path,
                policyValue: valueFromPolicy,
                targetValue
              });
            if (!targetValue.every((value) => valueFromPolicy.includes(value)))
              throw new PolicyValidationError("The target does not contain all the values from the policy superset", {
                path,
                policyValue: valueFromPolicy,
                targetValue
              });
            break;
          }
          case "essential": {
            if (!valueFromPolicy) break;
            const targetValue = resolvedLeafMetadata.getPropertyValue(serviceKey, servicePropertyKey);
            if (isNullOrUndefined(targetValue))
              throw new PolicyValidationError("The policy is required to have a value", {
                path,
                policyValue: valueFromPolicy,
                targetValue
              });
            if (Array.isArray(targetValue) && targetValue.length === 0)
              throw new PolicyValidationError("The target is empty and is essential to have a value", {
                path,
                policyValue: valueFromPolicy,
                targetValue
              });
            break;
          }
        }
      }
    }
  }
  return {
    resolvedLeafMetadata: resolvedLeafMetadata.asMetadata()
  };
}

// src/resolveTrustChains/resolveTrustChains.ts
var ENTITY_STATEMENT_CONTENT_TYPE = "application/entity-statement+jwt";
var fail = (message) => new OpenIdFederationError("validation" /* Validation */, message);
var reasonOf = (error) => error instanceof Error && error.message ? error.message : String(error);
var resolveTrustChainsWithFailures = async (options) => {
  const {
    entityId,
    verifyJwtCallback,
    fetchCallback,
    clockSkewSeconds = 0,
    maxDepth = 8,
    maxRequests = 64,
    maxAuthorityHints = 10,
    understoodCriticalClaims = []
  } = options;
  const now = options.currentDate ?? /* @__PURE__ */ new Date();
  const trustAnchors = [
    ...options.trustAnchors ?? [],
    ...(options.trustAnchorEntityIds ?? []).map((id) => ({ entityId: id }))
  ];
  if (trustAnchors.length === 0) {
    throw fail("Cannot resolve a trust chain for zero trust anchors");
  }
  const findTrustAnchor = (id) => trustAnchors.find((anchor) => isSameEntityId(anchor.entityId, id));
  const failures = [];
  let requests = 0;
  let visits = 0;
  const get2 = async (url, searchParams) => {
    requests++;
    if (requests > maxRequests) {
      throw fail(`trust chain resolution exceeded ${maxRequests} requests`);
    }
    return fetcher.get({ url, searchParams, requiredContentType: ENTITY_STATEMENT_CONTENT_TYPE, fetchCallback });
  };
  const assertCurrent = (statement) => {
    const skewMs = clockSkewSeconds * 1e3;
    if (!Number.isFinite(statement.iat.getTime()) || !Number.isFinite(statement.exp.getTime())) {
      throw fail(`statement about '${statement.sub}' issued by '${statement.iss}' has an invalid iat or exp`);
    }
    if (statement.iat.getTime() > now.getTime() + skewMs) {
      throw fail(`statement about '${statement.sub}' issued by '${statement.iss}' has an iat in the future`);
    }
    if (statement.exp.getTime() <= now.getTime() - skewMs) {
      throw fail(`statement about '${statement.sub}' issued by '${statement.iss}' has expired`);
    }
    const notUnderstood = (statement.crit ?? []).filter((claim) => !understoodCriticalClaims.includes(claim));
    if (notUnderstood.length > 0) {
      throw fail(
        `statement about '${statement.sub}' issued by '${statement.iss}' has critical claims that are not understood: ${notUnderstood.join(", ")}`
      );
    }
  };
  const entityConfigurations = /* @__PURE__ */ new Map();
  const fetchEntityConfiguration2 = (id) => {
    let pending = entityConfigurations.get(id);
    if (!pending) {
      pending = (async () => {
        const jwt = await get2(addPaths(id, ".well-known", "openid-federation"));
        const { claims } = validate({
          schema: entityConfigurationJwtSchema,
          data: jwt,
          errorMessage: `entity configuration of '${id}' is invalid`
        });
        if (!isSameEntityId(claims.sub, id)) {
          throw fail(`entity configuration fetched for '${id}' has subject '${claims.sub}'`);
        }
        await verifyJwtSignature({ jwt, verifyJwtCallback });
        assertCurrent(claims);
        return { jwt, claims };
      })();
      entityConfigurations.set(id, pending);
    }
    return pending;
  };
  const discover = async (id, path) => {
    visits++;
    if (visits > maxRequests) {
      throw fail(`trust chain resolution exceeded ${maxRequests} entity visits`);
    }
    const configuration = await fetchEntityConfiguration2(id);
    const localPath = [...path, configuration];
    const paths2 = [];
    if (findTrustAnchor(configuration.claims.sub)) {
      paths2.push(localPath);
    }
    if (localPath.length > maxDepth) return paths2;
    const superiors = [];
    for (const superior of configuration.claims.authority_hints ?? []) {
      if (superiors.length === maxAuthorityHints) break;
      if (localPath.some((entry) => isSameEntityId(entry.claims.sub, superior))) continue;
      if (superiors.some((entry) => isSameEntityId(entry, superior))) continue;
      superiors.push(superior);
    }
    const results = await Promise.allSettled(superiors.map((superior) => discover(superior, localPath)));
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        paths2.push(...result.value);
      } else {
        failures.push({
          entityIds: [...localPath.map((entry) => entry.claims.sub), superiors[index]],
          reason: reasonOf(result.reason),
          cause: result.reason
        });
      }
    });
    return paths2;
  };
  const validatePath = async (path) => {
    const leaf = path[0];
    const trustAnchorConfiguration = path[path.length - 1];
    const trustAnchor = findTrustAnchor(trustAnchorConfiguration.claims.sub);
    if (trustAnchor.jwks) {
      await verifyJwtSignature({
        jwt: trustAnchorConfiguration.jwt,
        jwks: trustAnchor.jwks,
        verifyJwtCallback
      }).catch((error) => {
        throw fail(
          `entity configuration of trust anchor '${trustAnchor.entityId}' is not signed with a configured key: ${reasonOf(error)}`
        );
      });
    }
    const statements = [];
    for (let index = 0; index < path.length - 1; index++) {
      const subject = path[index];
      const superior = path[index + 1];
      const fetchEndpoint = superior.claims.metadata?.federation_entity?.federation_fetch_endpoint;
      if (!fetchEndpoint) {
        throw fail(`'${superior.claims.sub}' has no federation_fetch_endpoint`);
      }
      const jwt = await get2(fetchEndpoint, { sub: subject.claims.sub });
      const { claims } = validate({
        schema: entityStatementJwtSchema,
        data: jwt,
        errorMessage: `subordinate statement about '${subject.claims.sub}' issued by '${superior.claims.sub}' is invalid`
      });
      if (!isSameEntityId(claims.iss, superior.claims.sub) || !isSameEntityId(claims.sub, subject.claims.sub)) {
        throw fail(
          `subordinate statement requested from '${superior.claims.sub}' about '${subject.claims.sub}' has issuer '${claims.iss}' and subject '${claims.sub}'`
        );
      }
      assertCurrent(claims);
      if (claims.constraints?.naming_constraints) {
        throw fail(`'${superior.claims.sub}' sets naming_constraints, which are not supported`);
      }
      const maxPathLength = claims.constraints?.max_path_length;
      if (maxPathLength !== void 0 && index > maxPathLength) {
        throw fail(`'${superior.claims.sub}' allows ${maxPathLength} intermediates, the chain has ${index}`);
      }
      statements.push({ jwt, claims });
    }
    const signers = statements.length > 0 ? [leaf, ...statements] : [];
    for (let index = 0; index < signers.length; index++) {
      const signed = signers[index];
      const next = statements[index];
      const jwks = next ? next.claims.jwks : trustAnchorConfiguration.claims.jwks;
      await verifyJwtSignature({ jwt: signed.jwt, jwks, verifyJwtCallback }).catch((error) => {
        throw fail(
          `statement about '${signed.claims.sub}' issued by '${signed.claims.iss}' is not signed with a key listed by '${next ? next.claims.iss : trustAnchorConfiguration.claims.sub}': ${reasonOf(error)}`
        );
      });
    }
    const expiresAt = new Date(Math.min(...[...path, ...statements].map((statement) => statement.claims.exp.getTime())));
    if (statements.length === 0) {
      return {
        valid: true,
        chain: [leaf.claims],
        jwtChain: [leaf.jwt],
        rawLeafEntityConfiguration: leaf.claims,
        resolvedLeafMetadata: leaf.claims.metadata,
        trustAnchorEntityConfiguration: leaf.claims,
        expiresAt
      };
    }
    const statementClaims = statements.map((statement) => statement.claims);
    const { mergedPolicy } = combineMetadataPolicies({ statements: statementClaims });
    const mergedLeafMetadata = restrictEntityTypes(
      mergeMetadata(leaf.claims.metadata ?? {}, statementClaims[0]?.metadata ?? {}),
      statementClaims
    );
    const { resolvedLeafMetadata } = applyMetadataPolicyToMetadata({
      leafMetadata: mergedLeafMetadata,
      policyMetadata: mergedPolicy
    });
    return {
      valid: true,
      chain: [...statementClaims, trustAnchorConfiguration.claims],
      jwtChain: [leaf.jwt, ...statements.map((statement) => statement.jwt), trustAnchorConfiguration.jwt],
      rawLeafEntityConfiguration: leaf.claims,
      // Again after the policies, which could otherwise add a removed entity type back
      resolvedLeafMetadata: restrictEntityTypes(resolvedLeafMetadata, statementClaims),
      trustAnchorEntityConfiguration: trustAnchorConfiguration.claims,
      expiresAt
    };
  };
  let paths;
  try {
    paths = await discover(entityId, []);
  } catch (error) {
    return { trustChains: [], failures: [{ entityIds: [entityId], reason: reasonOf(error), cause: error }] };
  }
  const trustChains = [];
  for (const path of paths) {
    try {
      trustChains.push(await validatePath(path));
    } catch (error) {
      failures.push({ entityIds: path.map((entry) => entry.claims.sub), reason: reasonOf(error), cause: error });
    }
  }
  return { trustChains, failures };
};
var restrictEntityTypes = (metadata, statements) => {
  const allowed = statements.map((statement) => statement.constraints?.allowed_entity_types).filter((types) => types !== void 0);
  if (allowed.length === 0) return metadata;
  return Object.fromEntries(
    Object.entries(metadata).filter(
      ([entityType]) => entityType === "federation_entity" || allowed.every((types) => types.includes(entityType))
    )
  );
};
var resolveTrustChains = async (options) => (await resolveTrustChainsWithFailures(options)).trustChains;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MetadataMergeStrategy,
  MetadataOrderOfApplication,
  OpenIdFederationError,
  PolicyErrorStage,
  PolicyOperatorMergeError,
  PolicyValidationError,
  addOperator,
  addPaths,
  addSearchParams,
  allSupportedPolicies,
  applyMetadataPolicyToMetadata,
  base64ToBase64URL,
  combineMetadataPolicies,
  constraintSchema,
  createEntityConfiguration,
  createEntityStatement,
  createJsonWebToken,
  createJwtSignableInput,
  createPolicyOperatorSchema,
  dateSchema,
  defaultOperator,
  entityConfigurationClaimsSchema,
  entityConfigurationHeaderSchema,
  entityStatementClaimsSchema,
  entityStatementHeaderSchema,
  essentialOperator,
  federationEntityMetadata,
  fetchEntityConfiguration,
  fetchEntityConfigurationChains,
  fetchEntityStatement,
  fetchEntityStatementChain,
  fetcher,
  getUsedJsonWebKey,
  hasMediaType,
  isExistingPolicyKey,
  isSameEntityId,
  jsonWebKeySchema,
  jsonWebKeySetSchema,
  jsonWebTokenSchema,
  metadataPolicySchema,
  metadataSchema,
  oauthAuthorizationServerEntityMetadata,
  oauthClientEntityMetadata,
  oauthResourceEntityMetadata,
  oneOfOperator,
  openIdCredentialIssuerEntityMetadata,
  openIdProviderEntityMetadata,
  openidCredentialVerifierEntityMetadata,
  openidRelyingPartyEntityMetadata,
  resolveTrustChains,
  resolveTrustChainsWithFailures,
  stringifyJwtPart,
  subsetOfOperator,
  supersetOfOperator,
  swapValidators,
  trustMarkClaimsSchema,
  trustMarkIssuerSchema,
  trustMarkOwnerSchema,
  trustMarkSchema,
  valueOperator
});
//# sourceMappingURL=index.js.map