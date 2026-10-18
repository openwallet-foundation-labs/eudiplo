// src/constraints.ts
import { z } from "zod";
var constraintSchema = z.object({
  max_path_length: z.number().optional(),
  naming_constraints: z.object({
    permitted: z.array(z.string()).optional(),
    excluded: z.array(z.string()).optional()
  }).optional(),
  allowed_entity_types: z.array(
    z.string().refine((s) => s !== "federation_entity", {
      message: `Value cannot be "federation_entity"`
    })
  ).optional()
});

// src/jsonWeb/jsonWebKey.ts
import { z as z2 } from "zod";
var jsonWebKeySchema = z2.object({
  kty: z2.string(),
  // TODO: spec mentions kid may be undefined, but we always need a key id for open id federation
  kid: z2.string(),
  use: z2.string().optional(),
  key_ops: z2.array(z2.string()).optional(),
  alg: z2.string().optional(),
  x5u: z2.string().optional(),
  x5c: z2.array(z2.string()).optional(),
  x5t: z2.string().optional(),
  "x5t#S256": z2.string().optional()
}).passthrough();

// src/jsonWeb/jsonWebKeySet.ts
import { z as z3 } from "zod";
var jsonWebKeySetSchema = z3.object({
  keys: z3.array(jsonWebKeySchema)
});

// src/jsonWeb/jsonWebToken.ts
import { Buffer } from "buffer";
import { z as z4 } from "zod";

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
var defaultSchema = z4.record(z4.string().or(z4.number()), z4.unknown());
var jsonWebTokenSchema = ({
  claimsSchema = defaultSchema,
  headerSchema = defaultSchema
} = {
  claimsSchema: defaultSchema,
  headerSchema: defaultSchema
}) => z4.string().transform((s, ctx) => {
  const [header, claims, signature] = s.split(".");
  if (!header) {
    ctx.addIssue({
      code: z4.ZodIssueCode.custom,
      message: "JWT does not contain a header parameter"
    });
    return z4.NEVER;
  }
  if (!claims) {
    ctx.addIssue({
      code: z4.ZodIssueCode.custom,
      message: "JWT does not contain a payload"
    });
    return z4.NEVER;
  }
  if (!signature) {
    ctx.addIssue({
      code: z4.ZodIssueCode.custom,
      message: "JWT does not contain a signature"
    });
    return z4.NEVER;
  }
  const decodedHeader = Buffer.from(header, "base64").toString();
  const decodedClaims = Buffer.from(claims, "base64").toString();
  const decodedSignature = Buffer.from(signature, "base64");
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
import { Buffer as Buffer2 } from "buffer";

// src/utils/encoding.ts
function base64ToBase64URL(base64) {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// src/jsonWeb/createJsonWebToken.ts
var createJsonWebToken = (header, payload, signature) => {
  const encodedHeader = base64ToBase64URL(Buffer2.from(JSON.stringify(header)).toString("base64"));
  const encodedPayload = base64ToBase64URL(Buffer2.from(JSON.stringify(payload)).toString("base64"));
  const encodedSignature = base64ToBase64URL(Buffer2.from(signature).toString("base64"));
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
};

// src/jsonWeb/getUsedJsonWebKey.ts
import { z as z5 } from "zod";
var getUsedJsonWebKey = (header, claims) => {
  const validatedHeader = validate({
    schema: z5.object({
      kid: z5.string()
    }).passthrough(),
    data: header,
    errorMessage: "invalid header claims. Should contain a key id"
  });
  const validatedClaims = validate({
    schema: z5.object({ jwks: jsonWebKeySetSchema }).passthrough(),
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
import { Buffer as Buffer3 } from "buffer";
var createJwtSignableInput = (header, payload) => {
  if (Object.keys(header).length === 0) {
    throw new Error("Can not create JWT with an empty header");
  }
  if (Object.keys(payload).length === 0) {
    throw new Error("Can not create JWT with an empty payload");
  }
  const encodedHeader = base64ToBase64URL(Buffer3.from(JSON.stringify(header)).toString("base64"));
  const encodedPayload = base64ToBase64URL(Buffer3.from(JSON.stringify(payload)).toString("base64"));
  const toBeSignedString = `${encodedHeader}.${encodedPayload}`;
  return new Uint8Array(Buffer3.from(toBeSignedString));
};

// src/metadata/metadata.ts
import { z as z21 } from "zod";

// src/metadata/entity/federationEntity.ts
import { z as z16 } from "zod";

// src/metadata/common.ts
import { z as z6 } from "zod";
var commonMetadataSchema = z6.object({
  // -- 5.2.1 Extensions for JWK Sets in Entity Metadata
  signed_jwks_uri: z6.string().url().optional(),
  jwks_uri: z6.string().url().optional(),
  jwks: jsonWebKeySetSchema.optional(),
  // -- 5.2.2 informational Metadata Extensions --
  organization_name: z6.string().optional(),
  contacts: z6.array(z6.string()).min(1).optional(),
  logo_uri: z6.string().url().optional(),
  policy_uri: z6.string().url().optional(),
  homepage_uri: z6.string().url().optional()
});

// src/metadata/operator/MetadataMergeStrategy.ts
var MetadataMergeStrategy = /* @__PURE__ */ ((MetadataMergeStrategy2) => {
  MetadataMergeStrategy2[MetadataMergeStrategy2["OperatorValuesEqual"] = 0] = "OperatorValuesEqual";
  MetadataMergeStrategy2[MetadataMergeStrategy2["Union"] = 1] = "Union";
  MetadataMergeStrategy2[MetadataMergeStrategy2["Intersection"] = 2] = "Intersection";
  MetadataMergeStrategy2[MetadataMergeStrategy2["LogicalOr"] = 3] = "LogicalOr";
  MetadataMergeStrategy2[MetadataMergeStrategy2["IntersectionMayBeEmpty"] = 4] = "IntersectionMayBeEmpty";
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
import { z as z7 } from "zod";
var swapValidators = (schema, newValidator) => {
  return z7.object(
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
import { z as z8 } from "zod";
var addOperator = createPolicyOperatorSchema({
  key: "add",
  parameterJsonValues: [
    z8.array(z8.string()),
    // TODO: See how we want to we handle the comparison of objects
    // z.array(z.record(z.string().or(z.number()), z.unknown())),
    z8.array(z8.number())
  ],
  operatorJsonValues: [
    z8.array(z8.string()),
    // TODO: See how we want to we handle the comparison of objects
    // z.array(z.record(z.string().or(z.number()), z.unknown())),
    z8.array(z8.number())
  ],
  canBeCombinedWith: ["value", "default", "subset_of", "superset_of", "essential"],
  orderOfApplication: 1 /* AfterValue */,
  mergeStrategy: 1 /* Union */
});

// src/metadata/operator/standard/oneOf.ts
import { z as z9 } from "zod";
var oneOfOperator = createPolicyOperatorSchema({
  key: "one_of",
  parameterJsonValues: [
    z9.string(),
    // TODO: See how we want to we handle the comparison of objects
    // z.record(z.string().or(z.number()), z.unknown()),
    z9.number()
  ],
  operatorJsonValues: [
    z9.array(z9.string()),
    // TODO: See how we want to we handle the comparison of objects
    // z.array(z.record(z.string().or(z.number()), z.unknown())),
    z9.array(z9.number())
  ],
  canBeCombinedWith: ["value", "default", "essential"],
  orderOfApplication: 3 /* AfterDefault */,
  mergeStrategy: 2 /* Intersection */
});

// src/metadata/operator/standard/value.ts
import { z as z10 } from "zod";
var valueOperator = createPolicyOperatorSchema({
  key: "value",
  parameterJsonValues: [
    z10.string(),
    z10.number(),
    z10.boolean(),
    z10.record(z10.string().or(z10.number()), z10.unknown()),
    z10.array(z10.unknown())
  ],
  operatorJsonValues: [
    z10.string(),
    z10.number(),
    z10.boolean(),
    z10.record(z10.string().or(z10.number()), z10.unknown()),
    z10.array(z10.unknown()),
    z10.null()
  ],
  canBeCombinedWith: ["add", "default", "one_of", "subset_of", "superset_of", "essential"],
  orderOfApplication: 0 /* First */,
  mergeStrategy: 0 /* OperatorValuesEqual */
});

// src/metadata/operator/standard/default.ts
import { z as z11 } from "zod";
var defaultOperator = createPolicyOperatorSchema({
  key: "default",
  parameterJsonValues: [
    z11.string(),
    z11.number(),
    z11.boolean(),
    z11.record(z11.string().or(z11.number()), z11.unknown()),
    z11.array(z11.unknown())
  ],
  operatorJsonValues: [
    z11.string(),
    z11.number(),
    z11.boolean(),
    z11.record(z11.string().or(z11.number()), z11.unknown()),
    z11.array(z11.unknown())
  ],
  canBeCombinedWith: ["value", "add", "one_of", "subset_of", "superset_of", "essential"],
  orderOfApplication: 2 /* AfterAdd */,
  mergeStrategy: 0 /* OperatorValuesEqual */
});

// src/metadata/operator/standard/subsetOf.ts
import { z as z12 } from "zod";
var subsetOfOperator = createPolicyOperatorSchema({
  key: "subset_of",
  parameterJsonValues: [
    z12.array(z12.string()),
    // TODO: See how we want to we handle the comparison of objects
    // z.array(z.record(z.string().or(z.number()), z.unknown())),
    z12.array(z12.number())
  ],
  operatorJsonValues: [
    z12.array(z12.string()),
    // TODO: See how we want to we handle the comparison of objects
    // z.array(z.record(z.string().or(z.number()), z.unknown())),
    z12.array(z12.number())
  ],
  canBeCombinedWith: ["value", "add", "default", "superset_of", "essential"],
  orderOfApplication: 4 /* AfterOneOf */,
  mergeStrategy: 4 /* IntersectionMayBeEmpty */
});

// src/metadata/operator/standard/essential.ts
import { z as z13 } from "zod";
var essentialOperator = createPolicyOperatorSchema({
  key: "essential",
  parameterJsonValues: [
    z13.string(),
    z13.number(),
    z13.boolean(),
    z13.record(z13.string().or(z13.number())),
    z13.unknown(),
    z13.array(z13.unknown())
  ],
  operatorJsonValues: [z13.boolean()],
  canBeCombinedWith: ["add", "default", "one_of", "subset_of", "superset_of", "value"],
  orderOfApplication: 6 /* Last */,
  mergeStrategy: 3 /* LogicalOr */
});

// src/metadata/operator/standard/supersetOf.ts
import { z as z14 } from "zod";
var supersetOfOperator = createPolicyOperatorSchema({
  key: "superset_of",
  parameterJsonValues: [
    z14.array(z14.string()),
    // TODO: See how we want to we handle the comparison of objects
    // z.array(z.record(z.string().or(z.number()), z.unknown())),
    z14.array(z14.number())
  ],
  operatorJsonValues: [
    z14.array(z14.string()),
    // TODO: See how we want to we handle the comparison of objects
    // z.array(z.record(z.string().or(z.number()), z.unknown())),
    z14.array(z14.number())
  ],
  canBeCombinedWith: ["value", "add", "default", "subset_of", "essential"],
  orderOfApplication: 5 /* AfterSubsetOf */,
  mergeStrategy: 1 /* Union */
});

// src/metadata/policy.ts
import { z as z15 } from "zod";
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
var isSubset = (values, of) => Array.isArray(values) && Array.isArray(of) && values.every((value) => of.includes(value));
var conditionalCombinationErrors = (policy) => {
  const errors = [];
  const has = (key) => policy[key] !== void 0;
  const { value, add, one_of, subset_of, superset_of, essential } = policy;
  if (has("value")) {
    const values = value === null ? [] : value;
    if (value === null && has("default")) errors.push("'value' null can not be combined with 'default'");
    if (value === null && essential === true) errors.push("'value' null can not be combined with 'essential' true");
    if (has("add") && !isSubset(add, values))
      errors.push("the values of 'add' must be a subset of the values of 'value'");
    if (has("one_of") && !(Array.isArray(one_of) && value !== null && one_of.includes(value)))
      errors.push("the value of 'value' must be among the 'one_of' values");
    if (has("subset_of") && !isSubset(values, subset_of))
      errors.push("the values of 'value' must be a subset of the values of 'subset_of'");
    if (has("superset_of") && !isSubset(superset_of, values))
      errors.push("the values of 'value' must be a superset of the values of 'superset_of'");
  }
  if (has("add") && has("subset_of") && !isSubset(add, subset_of))
    errors.push("the values of 'add' must be a subset of the values of 'subset_of'");
  if (has("subset_of") && has("superset_of") && !isSubset(superset_of, subset_of))
    errors.push("the values of 'subset_of' must be a superset of the values of 'superset_of'");
  return errors;
};
var metadataPolicySchema = z15.object(
  Object.entries(allSupportedPolicies).reduce(
    // biome-ignore lint/performance/noAccumulatingSpread: In this case we want to use the spread operator
    (acc, [key, policy]) => ({ ...acc, [key]: policy.operatorSchema }),
    {}
  )
).and(z15.record(z15.string(), z15.any())).superRefine((data, ctx) => {
  const dataKeys = Object.keys(data);
  for (const dataKey of dataKeys) {
    if (!isExistingPolicyKey(dataKey)) continue;
    const { operator } = allSupportedPolicies[dataKey];
    if (dataKeys.some(
      (key) => key !== operator.key && isExistingPolicyKey(key) && !operator.canBeCombinedWith.includes(key)
    )) {
      ctx.addIssue({
        code: z15.ZodIssueCode.custom,
        message: `policy operator '${operator.key}' can only be combined with one of: [${operator.canBeCombinedWith.join(
          ", "
        )}]. keys: [${Object.keys(data).join(",")}]`
      });
    }
  }
  for (const message of conditionalCombinationErrors(data)) {
    ctx.addIssue({ code: z15.ZodIssueCode.custom, message });
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
    federation_fetch_endpoint: z16.string().url().optional(),
    federation_list_endpoint: z16.string().url().optional(),
    federation_resolve_endpoint: z16.string().url().optional(),
    federation_trust_mark_status_endpoint: z16.string().url().optional(),
    federation_trust_mark_list_endpoint: z16.string().url().optional(),
    federation_trust_mark_endpoint: z16.string().url().optional(),
    federation_historical_keys_endpoint: z16.string().url().optional()
  }
});

// src/metadata/entity/oauthClient.ts
var oauthClientEntityMetadata = createEntity({ identifier: "oauth_client" });

// src/metadata/entity/oauthResource.ts
var oauthResourceEntityMetadata = createEntity({
  identifier: "oauth_resource"
});

// src/metadata/entity/openIdProvider.ts
import { z as z17 } from "zod";
var openIdProviderEntityMetadata = createEntity({
  identifier: "openid_provider",
  passThroughUnknownProperties: true,
  additionalValidation: {
    client_registration_types_supported: z17.array(z17.string()).optional(),
    federation_registration_endpoint: z17.string().url().optional(),
    request_authentication_methods_supported: z17.object({
      authorization_endpoint: z17.array(z17.string()).optional(),
      pushed_authorization_request_endpoint: z17.array(z17.string()).optional()
    }).optional(),
    request_authentication_signing_alg_values_supported: z17.array(z17.string()).optional()
  }
});

// src/metadata/entity/openIdRelyingParty.ts
import { z as z18 } from "zod";
var openidRelyingPartyEntityMetadata = createEntity({
  identifier: "openid_relying_party",
  passThroughUnknownProperties: true,
  additionalValidation: {
    client_registration_types: z18.array(z18.string()).optional()
  }
});

// src/metadata/entity/oauthAuthorizationServer.ts
var oauthAuthorizationServerEntityMetadata = createEntity({
  identifier: "oauth_authorization_server"
});

// src/metadata/entity/openIdCredentialIssuer.ts
import { z as z19 } from "zod";
var openIdCredentialIssuerEntityMetadata = createEntity({
  identifier: "openid_credential_issuer",
  passThroughUnknownProperties: true,
  additionalValidation: {
    client_registration_types_supported: z19.array(z19.string()).optional(),
    federation_registration_endpoint: z19.string().url().optional(),
    request_authentication_methods_supported: z19.object({
      authorization_endpoint: z19.array(z19.string()).optional(),
      pushed_authorization_request_endpoint: z19.array(z19.string()).optional()
    }).optional(),
    request_authentication_signing_alg_values_supported: z19.array(z19.string()).optional()
  }
});

// src/metadata/entity/openIdCredentialVerifier.ts
import { z as z20 } from "zod";
var openidCredentialVerifierEntityMetadata = createEntity({
  identifier: "openid_credential_verifier",
  passThroughUnknownProperties: true,
  additionalValidation: {
    client_registration_types: z20.array(z20.string()).optional()
  }
});

// src/metadata/metadata.ts
var metadataSchema = z21.object({
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
import { z as z23 } from "zod";

// src/utils/dateSchema.ts
import { z as z22 } from "zod";
var dateSchema = z22.number().finite().transform((seconds) => new Date(seconds * 1e3));

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
var trustMarkClaimsSchema = z23.object({
  iss: z23.string(),
  sub: z23.string(),
  trust_mark_type: z23.string(),
  iat: dateSchema,
  exp: dateSchema.optional(),
  logo_uri: z23.string().url().optional(),
  ref: z23.string().url().optional(),
  delegation: z23.string().optional()
}).passthrough();
var trustMarkSchema = z23.object({
  trust_mark_type: z23.string(),
  trust_mark: jsonWebTokenSchema({
    claimsSchema: trustMarkClaimsSchema
  })
}).refine((entry) => entry.trust_mark_type === entry.trust_mark.claims.trust_mark_type, {
  message: "trust_mark_type must be the trust_mark_type of the trust mark JWT",
  path: ["trust_mark_type"]
});

// src/trustMark/trustMarkOwner.ts
import { z as z24 } from "zod";
var trustMarkOwnerSchema = z24.record(
  z24.string(),
  z24.object({
    sub: z24.string(),
    jwks: jsonWebKeySetSchema
  })
);

// src/trustMark/trustMarkIssuer.ts
import { z as z25 } from "zod";
var trustMarkIssuerSchema = z25.record(z25.string(), z25.array(z25.string()));

// src/entityStatement/entityStatementClaims.ts
import { z as z26 } from "zod";
var entityStatementClaimsSchema = z26.object({
  iss: z26.string(),
  sub: z26.string(),
  iat: dateSchema,
  exp: dateSchema,
  jwks: jsonWebKeySetSchema,
  authority_hints: z26.array(z26.string().url()).optional(),
  metadata: metadataSchema.optional(),
  metadata_policy: z26.record(z26.record(metadataPolicySchema.optional())).optional(),
  constraints: constraintSchema.optional(),
  crit: z26.array(z26.string()).optional(),
  metadata_policy_crit: z26.array(z26.string()).optional(),
  trust_marks: z26.array(trustMarkSchema).optional(),
  trust_mark_issuers: trustMarkIssuerSchema.optional(),
  trust_mark_owners: trustMarkOwnerSchema.optional(),
  source_endpoint: z26.string().url().optional()
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
import { z as z27 } from "zod";
var entityStatementHeaderSchema = z27.object({
  kid: z27.string(),
  typ: z27.literal("entity-statement+jwt")
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
import { Buffer as Buffer4 } from "buffer";
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
  const header = JSON.parse(Buffer4.from(encodedHeader, "base64").toString());
  const claims = JSON.parse(Buffer4.from(encodedClaims, "base64").toString());
  const signature = new Uint8Array(Buffer4.from(encodedSignature, "base64"));
  return {
    header,
    claims,
    signature,
    signableInput: new Uint8Array(Buffer4.from(`${encodedHeader}.${encodedClaims}`))
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

// src/entityConfiguration/entityConfigurationClaims.ts
var entityConfigurationClaimsSchema = entityStatementClaimsSchema.refine((data) => data.iss === data.sub, {
  message: "iss and sub must be equal",
  path: ["iss", "sub"]
});

// src/entityConfiguration/entityConfigurationHeader.ts
import { z as z28 } from "zod";
var entityConfigurationHeaderSchema = z28.object({
  kid: z28.string(),
  typ: z28.literal("entity-statement+jwt")
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
  hasEntityType(service) {
    return this.leafMetadata[service] !== void 0;
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
    if (!mergedLeafMetadata.hasEntityType(String(entityType))) continue;
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
    if (combinedPolicyRules[policyPropertyKey] === void 0) {
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
      case 2 /* Intersection */:
      case 4 /* IntersectionMayBeEmpty */: {
        if (!Array.isArray(existingPolicyRuleValue) || !Array.isArray(newPolicyRuleValue)) {
          throw new PolicyOperatorMergeError("Existing policy rule value is not an array", {
            path: contextPath,
            operatorA: existingPolicyRules,
            operatorB: newPolicyRules
          });
        }
        const intersection = intersect(existingPolicyRuleValue, newPolicyRuleValue);
        if (intersection.length === 0 && operator.mergeStrategy === 2 /* Intersection */) {
          throw new PolicyOperatorMergeError("Intersection is empty", {
            path: contextPath,
            operatorA: existingPolicyRules,
            operatorB: newPolicyRules
          });
        }
        combinedPolicyRules[policyPropertyKey] = intersection;
        break;
      }
      case 3 /* LogicalOr */:
        if (typeof existingPolicyRuleValue !== "boolean" || typeof newPolicyRuleValue !== "boolean") {
          throw new PolicyOperatorMergeError("Existing policy rule value is not a boolean", {
            path: contextPath,
            operatorA: existingPolicyRules,
            operatorB: newPolicyRules
          });
        }
        combinedPolicyRules[policyPropertyKey] = existingPolicyRuleValue || newPolicyRuleValue;
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
    if (!resolvedLeafMetadata.hasEntityType(serviceKey)) continue;
    for (const [servicePropertyKey, policyValue] of objectToEntries(service)) {
      const policies = objectToEntries(policyValue).filter(([key]) => isExistingPolicyKey(key)).sort(
        ([policyKeyA], [policyKeyB]) => allSupportedPolicies[policyKeyA].orderOfApplication - allSupportedPolicies[policyKeyB].orderOfApplication
      );
      const path = `${serviceKey}.${servicePropertyKey}`;
      const isScope = servicePropertyKey === "scope";
      const scope = resolvedLeafMetadata.getPropertyValue(serviceKey, servicePropertyKey);
      if (isScope && typeof scope === "string") {
        resolvedLeafMetadata.setPropertyValue(serviceKey, servicePropertyKey, splitScope(scope));
      }
      for (const [policyPropertyKey, rawValueFromPolicy] of policies) {
        const valueFromPolicy = isScope && typeof rawValueFromPolicy === "string" ? splitScope(rawValueFromPolicy) : rawValueFromPolicy;
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
            if (isNullOrUndefined(targetValue)) break;
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
            resolvedLeafMetadata.setPropertyValue(serviceKey, servicePropertyKey, newValue);
            break;
          }
          case "superset_of": {
            const targetValue = resolvedLeafMetadata.getPropertyValue(serviceKey, servicePropertyKey);
            if (isNullOrUndefined(targetValue)) break;
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
            if (!valueFromPolicy.every((value) => targetValue.includes(value)))
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
            break;
          }
        }
      }
      const resolvedScope = resolvedLeafMetadata.getPropertyValue(serviceKey, servicePropertyKey);
      if (isScope && Array.isArray(resolvedScope)) {
        resolvedLeafMetadata.setPropertyValue(serviceKey, servicePropertyKey, resolvedScope.join(" "));
      }
    }
  }
  return {
    resolvedLeafMetadata: resolvedLeafMetadata.asMetadata()
  };
}
var splitScope = (scope) => scope.split(" ").filter((value) => value !== "");

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
  const { trustAnchors } = options;
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
        assertEntityConfigurationClaims(claims);
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
      assertSubordinateStatementClaims(claims);
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
      // The policies do not add entity types, so a removed one stays removed
      resolvedLeafMetadata,
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
var assertEntityConfigurationClaims = (claims) => {
  const present = ["metadata_policy", "metadata_policy_crit", "constraints", "source_endpoint"].filter(
    (claim) => claims[claim] !== void 0
  );
  if (present.length > 0) {
    throw fail(
      `entity configuration of '${claims.sub}' contains ${present.join(", ")}, which only subordinate statements may contain`
    );
  }
  if (claims.authority_hints?.length === 0) {
    throw fail(`entity configuration of '${claims.sub}' has an empty authority_hints array`);
  }
};
var assertSubordinateStatementClaims = (claims) => {
  const present = ["authority_hints", "trust_marks", "trust_mark_issuers", "trust_mark_owners"].filter(
    (claim) => claims[claim] !== void 0
  );
  if (present.length > 0) {
    throw fail(
      `subordinate statement about '${claims.sub}' issued by '${claims.iss}' contains ${present.join(", ")}, which only entity configurations may contain`
    );
  }
  if (claims.metadata_policy_crit?.length === 0) {
    throw fail(
      `subordinate statement about '${claims.sub}' issued by '${claims.iss}' has an empty metadata_policy_crit array`
    );
  }
  if (claims.metadata_policy_crit !== void 0) {
    throw fail(
      `subordinate statement about '${claims.sub}' issued by '${claims.iss}' requires policy operators that are not supported: ${claims.metadata_policy_crit.join(", ")}`
    );
  }
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
export {
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
  fetchEntityStatement,
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
  subsetOfOperator,
  supersetOfOperator,
  swapValidators,
  trustMarkClaimsSchema,
  trustMarkIssuerSchema,
  trustMarkOwnerSchema,
  trustMarkSchema,
  valueOperator
};
//# sourceMappingURL=index.mjs.map