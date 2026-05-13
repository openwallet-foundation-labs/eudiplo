type CredentialFormat = 'dc+sd-jwt' | 'mso_mdoc';

type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'date';

type ClaimPathElement = string | number | null;

interface FieldDisplay {
  lang: string;
  label: string;
  description?: string;
}

interface ClaimFieldDefinition {
  path: ClaimPathElement[];
  type: FieldType;
  defaultValue?: unknown;
  mandatory?: boolean;
  disclosable?: boolean;
  namespace?: string;
  display?: FieldDisplay[];
  constraints?: Record<string, unknown>;
}

interface ClaimDisplayInfoV1 {
  name?: string;
  locale?: string;
}

interface ClaimMetadataV1 {
  path: ClaimPathElement[];
  mandatory?: boolean;
  display?: ClaimDisplayInfoV1[];
}

interface JsonSchema {
  $schema?: string;
  type?: string;
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  [key: string]: unknown;
}

interface CredentialConfigV1 extends Record<string, unknown> {
  config: {
    format: CredentialFormat;
    display?: Record<string, unknown>[];
    scope?: string;
    docType?: string;
    namespace?: string;
    claimsByNamespace?: Record<string, Record<string, unknown>>;
    claimsMetadata?: ClaimMetadataV1[];
    keyAttestationsRequired?: Record<string, unknown>;
  };
  claims?: Record<string, unknown>;
  disclosureFrame?: Record<string, unknown>;
  schema?: JsonSchema;
}

interface CredentialConfigV2 extends Record<string, unknown> {
  configVersion: 2;
  config: {
    format: CredentialFormat;
    display: Record<string, unknown>[];
    scope?: string;
    docType?: string;
    keyAttestationsRequired?: Record<string, unknown>;
  };
  fields: ClaimFieldDefinition[];
}

const JSON_SCHEMA_DRAFT_2020_12 = 'https://json-schema.org/draft/2020-12/schema';

function segmentToKey(segment: string | number | null): string {
  if (segment === null) {
    return '*';
  }
  return String(segment);
}

function getOrCreateChild(
  target: Record<string, unknown>,
  key: string,
  nextIsArray: boolean
): Record<string, unknown> | unknown[] {
  const current = target[key];
  if (current !== undefined) {
    if (Array.isArray(current)) {
      return current;
    }
    if (typeof current === 'object' && current !== null) {
      return current as Record<string, unknown>;
    }
  }

  const created: Record<string, unknown> | unknown[] = nextIsArray ? [] : {};
  target[key] = created;
  return created;
}

function setValueAtPath(
  target: Record<string, unknown>,
  path: (string | number | null)[],
  value: unknown
): void {
  if (path.length === 0) {
    return;
  }

  let cursor: Record<string, unknown> | unknown[] = target;

  for (let index = 0; index < path.length; index += 1) {
    const segment = path[index];
    const isLast = index === path.length - 1;
    const next = path[index + 1];

    if (Array.isArray(cursor)) {
      const arrayIndex = typeof segment === 'number' ? segment : Number(segmentToKey(segment));
      if (!Number.isFinite(arrayIndex) || arrayIndex < 0) {
        return;
      }

      if (isLast) {
        cursor[arrayIndex] = value;
        return;
      }

      const current = cursor[arrayIndex];
      if (typeof current !== 'object' || current === null) {
        cursor[arrayIndex] = typeof next === 'number' ? [] : {};
      }

      cursor = cursor[arrayIndex] as Record<string, unknown> | unknown[];
      continue;
    }

    const key = segmentToKey(segment);
    if (isLast) {
      cursor[key] = value;
      return;
    }

    cursor = getOrCreateChild(cursor, key, typeof next === 'number');
  }
}

function getDisplayTitle(display: ClaimFieldDefinition['display']): string | undefined {
  if (!display || display.length === 0) {
    return undefined;
  }

  const en = display.find((entry) => entry.lang.toLowerCase().startsWith('en'));
  return en?.label ?? display[0]?.label;
}

function ensureSchemaNode(root: JsonSchema, path: (string | number | null)[]): JsonSchema {
  let cursor = root;

  for (const segment of path) {
    const key = segmentToKey(segment);
    if (!cursor.properties) {
      cursor.properties = {};
    }

    if (!cursor.properties[key]) {
      cursor.properties[key] = {
        type: 'object',
        properties: {},
      };
    }

    cursor = cursor.properties[key] as JsonSchema;
  }

  return cursor;
}

function ensureFrameNode(
  root: Record<string, unknown>,
  path: (string | number | null)[]
): Record<string, unknown> {
  let cursor = root;

  for (const segment of path) {
    const key = segmentToKey(segment);
    const current = cursor[key];
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      cursor[key] = {};
    }

    cursor = cursor[key] as Record<string, unknown>;
  }

  return cursor;
}

function normalizeDisplayToV1(
  display: ClaimFieldDefinition['display']
): ClaimDisplayInfoV1[] | undefined {
  if (!display || display.length === 0) {
    return undefined;
  }

  return display.map((entry) => ({
    name: entry.label,
    locale: entry.lang,
  }));
}

function buildClaims(fields: ClaimFieldDefinition[]): Record<string, unknown> {
  const claims: Record<string, unknown> = {};

  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(field, 'defaultValue')) {
      continue;
    }

    setValueAtPath(claims, field.path, field.defaultValue);
  }

  return claims;
}

function buildDisclosureFrame(fields: ClaimFieldDefinition[]): Record<string, unknown> | undefined {
  const frame: Record<string, unknown> = {};
  let hasDisclosure = false;

  for (const field of fields) {
    if (!field.disclosable || field.path.length === 0) {
      continue;
    }

    const parentPath = field.path.slice(0, -1);
    const leaf = segmentToKey(field.path[field.path.length - 1] ?? '');

    const node = ensureFrameNode(frame, parentPath);
    const existing = Array.isArray((node as any)._sd) ? ((node as any)._sd as string[]) : [];
    if (!existing.includes(leaf)) {
      existing.push(leaf);
      (node as any)._sd = existing;
    }

    hasDisclosure = true;
  }

  return hasDisclosure ? frame : undefined;
}

function buildClaimsMetadata(fields: ClaimFieldDefinition[]): ClaimMetadataV1[] {
  return fields
    .filter((field) => field.path.length > 0)
    .map((field) => {
      const metadata: ClaimMetadataV1 = {
        path: field.path,
      };

      if (typeof field.mandatory === 'boolean') {
        metadata.mandatory = field.mandatory;
      }

      const display = normalizeDisplayToV1(field.display);
      if (display) {
        metadata.display = display;
      }

      return metadata;
    });
}

function buildJsonSchema(fields: ClaimFieldDefinition[]): JsonSchema {
  const root: JsonSchema = {
    $schema: JSON_SCHEMA_DRAFT_2020_12,
    type: 'object',
    properties: {},
  };

  for (const field of fields) {
    if (field.path.length === 0) {
      continue;
    }

    const parent = ensureSchemaNode(root, field.path.slice(0, -1));
    const leafKey = segmentToKey(field.path[field.path.length - 1] ?? '');

    if (!parent.properties) {
      parent.properties = {};
    }

    const leafSchema: JsonSchema = {
      ...(field.constraints ?? {}),
      type: field.type === 'date' ? 'string' : field.type,
    };

    if (field.type === 'date') {
      if (!leafSchema['format']) {
        leafSchema['format'] = 'date';
      }
    }

    const title = getDisplayTitle(field.display);
    if (title) {
      leafSchema.title = title;
    }

    parent.properties[leafKey] = leafSchema;

    if (field.mandatory) {
      if (!Array.isArray(parent.required)) {
        parent.required = [];
      }
      if (!parent.required.includes(leafKey)) {
        parent.required.push(leafKey);
      }
    }
  }

  return root;
}

function buildClaimsByNamespace(
  fields: ClaimFieldDefinition[]
): Record<string, Record<string, unknown>> {
  const byNamespace: Record<string, Record<string, unknown>> = {};

  for (const field of fields) {
    if (!field.namespace || !Object.prototype.hasOwnProperty.call(field, 'defaultValue')) {
      continue;
    }

    if (!byNamespace[field.namespace]) {
      byNamespace[field.namespace] = {};
    }

    const namespaceTarget = byNamespace[field.namespace];
    const normalizedPath =
      field.path.length > 0 && segmentToKey(field.path[0] ?? '') === field.namespace
        ? field.path.slice(1)
        : field.path;

    setValueAtPath(namespaceTarget, normalizedPath, field.defaultValue);
  }

  return byNamespace;
}

function pathKey(path: ClaimPathElement[]): string {
  return JSON.stringify(path);
}

function parsePathKey(key: string): ClaimPathElement[] {
  try {
    const parsed = JSON.parse(key);
    return Array.isArray(parsed) ? (parsed as ClaimPathElement[]) : [];
  } catch {
    return [];
  }
}

function inferTypeFromValue(value: unknown): FieldType {
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return 'date';
    }
    return 'string';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (typeof value === 'object' && value !== null) {
    return 'object';
  }
  return 'string';
}

function inferTypeFromSchema(schema?: JsonSchema): FieldType | undefined {
  const schemaType = schema?.type;
  if (schemaType === 'integer') {
    return 'integer';
  }
  if (schemaType === 'number') {
    return 'number';
  }
  if (schemaType === 'boolean') {
    return 'boolean';
  }
  if (schemaType === 'array') {
    return 'array';
  }
  if (schemaType === 'object') {
    return 'object';
  }
  if (schemaType === 'string') {
    if (schema?.['format'] === 'date') {
      return 'date';
    }
    return 'string';
  }
  return undefined;
}

function getValueAtPath(
  target: Record<string, unknown> | undefined,
  path: ClaimPathElement[]
): unknown {
  if (!target) {
    return undefined;
  }

  let cursor: unknown = target;
  for (const segment of path) {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }

    if (Array.isArray(cursor)) {
      const index = typeof segment === 'number' ? segment : Number(segmentToKey(segment));
      if (!Number.isInteger(index) || index < 0) {
        return undefined;
      }
      cursor = cursor[index];
      continue;
    }

    if (typeof cursor !== 'object') {
      return undefined;
    }

    cursor = (cursor as Record<string, unknown>)[segmentToKey(segment)];
  }

  return cursor;
}

function collectLeafPaths(value: unknown, prefix: ClaimPathElement[] = []): ClaimPathElement[][] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [prefix];
    }

    const nested: ClaimPathElement[][] = [];
    for (let index = 0; index < value.length; index += 1) {
      nested.push(...collectLeafPaths(value[index], [...prefix, index]));
    }
    return nested;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return [prefix];
    }

    const nested: ClaimPathElement[][] = [];
    for (const [key, nestedValue] of entries) {
      nested.push(...collectLeafPaths(nestedValue, [...prefix, key]));
    }
    return nested;
  }

  return [prefix];
}

function collectDisclosurePaths(
  frame: unknown,
  prefix: ClaimPathElement[] = [],
  result: Set<string> = new Set<string>()
): Set<string> {
  if (!frame || typeof frame !== 'object') {
    return result;
  }

  const record = frame as Record<string, unknown>;
  const sd = (record as any)._sd;
  if (Array.isArray(sd)) {
    for (const name of sd) {
      if (typeof name === 'string') {
        result.add(pathKey([...prefix, name]));
      }
    }
  }

  for (const [key, nested] of Object.entries(record)) {
    if (key === '_sd') {
      continue;
    }
    collectDisclosurePaths(nested, [...prefix, key], result);
  }

  return result;
}

interface SchemaEntry {
  schema: JsonSchema;
  mandatory: boolean;
}

function collectSchemaLeafMap(
  schema: JsonSchema | undefined,
  prefix: ClaimPathElement[] = [],
  mandatory = false,
  result: Map<string, SchemaEntry> = new Map<string, SchemaEntry>()
): Map<string, SchemaEntry> {
  if (!schema || typeof schema !== 'object') {
    return result;
  }

  const properties = schema.properties;
  if (properties && typeof properties === 'object') {
    const required = new Set(Array.isArray(schema.required) ? schema.required : []);

    for (const [key, value] of Object.entries(properties)) {
      collectSchemaLeafMap(value, [...prefix, key], required.has(key), result);
    }

    return result;
  }

  if (prefix.length > 0) {
    result.set(pathKey(prefix), { schema, mandatory });
  }

  return result;
}

function collectMetadataByPath(
  metadata: ClaimMetadataV1[] | undefined
): Map<string, ClaimMetadataV1> {
  const map = new Map<string, ClaimMetadataV1>();
  for (const entry of metadata ?? []) {
    if (!Array.isArray(entry.path) || entry.path.length === 0) {
      continue;
    }

    map.set(pathKey(entry.path), entry);
  }
  return map;
}

function normalizeDisplay(
  display: ClaimDisplayInfoV1[] | undefined
): ClaimFieldDefinition['display'] {
  if (!display || display.length === 0) {
    return undefined;
  }

  return display
    .filter((entry) => !!entry.name)
    .map((entry) => ({
      lang: entry.locale ?? 'und',
      label: entry.name ?? '',
    }));
}

function collectPathsFromSchema(schema: JsonSchema | undefined): ClaimPathElement[][] {
  return Array.from(collectSchemaLeafMap(schema).keys()).map(parsePathKey);
}

function collectPaths(v1: CredentialConfigV1): {
  paths: ClaimPathElement[][];
  namespaceByPath: Map<string, string>;
} {
  const keys = new Set<string>();
  const namespaceByPath = new Map<string, string>();

  for (const path of collectLeafPaths(v1.claims)) {
    keys.add(pathKey(path));
  }

  for (const entry of v1.config.claimsMetadata ?? []) {
    if (Array.isArray(entry.path) && entry.path.length > 0) {
      keys.add(pathKey(entry.path));
    }
  }

  for (const key of collectDisclosurePaths(v1.disclosureFrame)) {
    keys.add(key);
  }

  for (const path of collectPathsFromSchema(v1.schema)) {
    keys.add(pathKey(path));
  }

  for (const [namespace, claims] of Object.entries(v1.config.claimsByNamespace ?? {})) {
    for (const path of collectLeafPaths(claims)) {
      const fullPath = [namespace, ...path];
      const key = pathKey(fullPath);
      keys.add(key);
      namespaceByPath.set(key, namespace);
    }
  }

  return {
    paths: Array.from(keys)
      .map(parsePathKey)
      .sort((a, b) => pathKey(a).localeCompare(pathKey(b))),
    namespaceByPath,
  };
}

function extractConstraints(schema: JsonSchema | undefined): Record<string, unknown> | undefined {
  if (!schema) {
    return undefined;
  }

  const {
    type: _type,
    title: _title,
    properties: _properties,
    required: _required,
    $schema: _$schema,
    ...constraints
  } = schema;

  return Object.keys(constraints).length > 0 ? constraints : undefined;
}

function normalizeConfig(v1: CredentialConfigV1): CredentialConfigV2['config'] {
  return {
    format: v1.config['format'],
    display: v1.config.display ?? [],
    scope: v1.config.scope,
    docType: v1.config.docType,
    keyAttestationsRequired: v1.config.keyAttestationsRequired,
  };
}

export function convertV1ToV2(v1: CredentialConfigV1): CredentialConfigV2 {
  const { paths, namespaceByPath } = collectPaths(v1);
  const metadataByPath = collectMetadataByPath(v1.config.claimsMetadata);
  const schemaByPath = collectSchemaLeafMap(v1.schema);
  const disclosureSet = collectDisclosurePaths(v1.disclosureFrame);
  const claimsByNamespace = v1.config.claimsByNamespace ?? {};

  const fields: ClaimFieldDefinition[] = [];

  for (const path of paths) {
    const key = pathKey(path);
    const metadata = metadataByPath.get(key);
    const schemaEntry = schemaByPath.get(key);

    let defaultValue = getValueAtPath(v1.claims, path);
    const namespace = namespaceByPath.get(key);
    if (defaultValue === undefined && namespace) {
      defaultValue = getValueAtPath(claimsByNamespace[namespace], path.slice(1));
    }

    const inferredType =
      inferTypeFromSchema(schemaEntry?.schema) ?? inferTypeFromValue(defaultValue);

    const field: ClaimFieldDefinition = {
      path,
      type: inferredType,
    };

    if (defaultValue !== undefined) {
      field.defaultValue = defaultValue;
    }

    const mandatoryFromMetadata = metadata?.mandatory === true;
    const mandatoryFromSchema = schemaEntry?.mandatory === true;
    if (mandatoryFromMetadata || mandatoryFromSchema) {
      field.mandatory = true;
    }

    if (v1.config['format'] === 'dc+sd-jwt') {
      field.disclosable = disclosureSet.has(key);
    }

    const display = normalizeDisplay(metadata?.display);
    if (display && display.length > 0) {
      field.display = display;
    }

    const constraints = extractConstraints(schemaEntry?.schema);
    if (constraints) {
      field.constraints = constraints;
    }

    if (namespace) {
      field.namespace = namespace;
    } else if (v1.config['format'] === 'mso_mdoc' && v1.config.namespace) {
      field.namespace = v1.config.namespace;
    }

    fields.push(field);
  }

  const { claims, disclosureFrame, schema, ...rest } = v1;
  const {
    claimsByNamespace: _claimsByNamespace,
    claimsMetadata: _claimsMetadata,
    namespace: _namespace,
    ...restConfig
  } = v1.config;

  return {
    ...rest,
    configVersion: 2,
    config: {
      ...restConfig,
      ...normalizeConfig(v1),
    },
    fields,
  };
}

export function deriveRuntimeArtifacts(fields: ClaimFieldDefinition[]): {
  claims: Record<string, unknown>;
  disclosureFrame?: Record<string, unknown>;
  claimsMetadata: ClaimMetadataV1[];
  schema: JsonSchema;
  claimsByNamespace: Record<string, Record<string, unknown>>;
} {
  return {
    claims: buildClaims(fields),
    disclosureFrame: buildDisclosureFrame(fields),
    claimsMetadata: buildClaimsMetadata(fields),
    schema: buildJsonSchema(fields),
    claimsByNamespace: buildClaimsByNamespace(fields),
  };
}
