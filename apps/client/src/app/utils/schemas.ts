import { Uri } from 'monaco-editor';

export class SchemaValidation {
  constructor(
    private uri: string,
    private schema: any
  ) {}

  getUri() {
    return Uri.parse(`a://b/${this.uri}.json`);
  }

  getSchemaUrl() {
    return `https://${this.uri}`;
  }

  getEditorSchema() {
    return {
      uri: `https://${this.uri}`,
      fileMatch: [this.getUri().toString()],
      schema: this.schema,
    };
  }

  getSchema() {
    return this.schema;
  }
}

export const vctSchema = new SchemaValidation('vct', {
  type: 'object',
  properties: {
    $schema: { type: 'string' },
    name: { type: 'string', description: 'The name of the VCT' },
    description: { type: 'string', description: 'The description of the VCT' },
  },
  required: ['name', 'description'],
  additionalProperties: false,
});

export const embeddedDisclosurePolicySchema = new SchemaValidation('embedded-disclosure-policy', {
  type: 'object',
  oneOf: [
    {
      title: 'AllowListPolicy',
      properties: {
        $schema: { type: 'string' },
        policy: { const: 'allowList' },
        values: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['policy', 'values'],
      additionalProperties: false,
    },
    {
      title: 'RootOfTrustPolicy',
      properties: {
        $schema: { type: 'string' },
        policy: { const: 'rootOfTrust' },
        values: { type: 'string' },
      },
      required: ['policy', 'values'],
      additionalProperties: false,
    },
    {
      title: 'AttestationBasedPolicy',
      properties: {
        $schema: { type: 'string' },
        policy: { const: 'attestationBased' },
        values: {
          type: 'array',
          items: { $ref: '#/$defs/PolicyCredential' },
        },
      },
      required: ['policy', 'values'],
      additionalProperties: false,
    },
    {
      title: 'NoneTrustPolicy',
      properties: {
        policy: { const: 'none' },
      },
      required: ['policy'],
      additionalProperties: false,
    },
  ],
  $defs: {
    PolicyCredential: {
      type: 'object',
      properties: {
        format: { type: 'string' },
        meta: { type: 'object', additionalProperties: true },
        iss: { type: 'string' },
      },
      required: ['format', 'meta', 'iss'],
      additionalProperties: false,
    },
  },
});

export const jwkSchema = new SchemaValidation('jwk', {
  type: 'object',
  properties: {
    kty: {
      type: 'string',
      title: 'Key Type',
      description: 'The type of the key (must be EC for ES256).',
      default: 'EC',
      enum: ['EC'],
      examples: ['EC'],
    },
    use: { type: 'string', const: 'sig', description: 'Key usage (must be sig)' },
    kid: { type: 'string', description: 'Key ID' },
    alg: { type: 'string', const: 'ES256', description: 'Algorithm (must be ES256)' },
    crv: { type: 'string', const: 'P-256', description: 'Curve (must be P-256)' },
    x: { type: 'string', description: 'X coordinate (base64url)' },
    y: { type: 'string', description: 'Y coordinate (base64url)' },
    d: { type: 'string', description: 'Private key (base64url, optional, only for private keys)' },
  },
  required: ['kty', 'use', 'kid', 'alg', 'crv', 'x', 'y'],
  additionalProperties: false,
});

export const schemas = [vctSchema, embeddedDisclosurePolicySchema, jwkSchema].map((schema) =>
  schema.getEditorSchema()
);
