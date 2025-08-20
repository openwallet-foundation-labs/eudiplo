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
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'VCT',
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
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'EmbeddedDisclosurePolicy',
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
        $schema: { type: 'string' },
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
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'JWK',
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

export const authenticationSchema = new SchemaValidation('authentication', {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'AuthenticationConfig',
  type: 'object',
  properties: {
    $schema: { type: 'string' },
    method: {
      type: 'string',
      enum: ['none', 'auth', 'presentationDuringIssuance'],
      description: 'The authentication method to use.',
    },
    config: {
      oneOf: [
        {
          type: 'object',
          title: 'AuthenticationUrlConfig',
          properties: {
            // Add properties for AuthenticationUrlConfig here
          },
          required: [],
        },
        {
          type: 'object',
          title: 'PresentationDuringIssuanceConfig',
          properties: {
            type: {
              type: 'string',
              description:
                'Link to the presentation configuration relevant for the issuance process.',
            },
          },
          required: ['type'],
        },
      ],
    },
    description: {
      type: 'string',
      description: 'Description of the authentication configuration.',
    },
  },
  required: ['method'],
  additionalProperties: false,
  if: {
    properties: { method: { const: 'none' } },
  },
  then: {
    not: { required: ['config'] },
  },
  else: {
    if: {
      properties: { method: { const: 'auth' } },
    },
    then: {
      required: ['config'],
      properties: {
        config: {
          required: ['url'],
        },
      },
    },
    else: {
      if: {
        properties: { method: { const: 'presentationDuringIssuance' } },
      },
      then: {
        required: ['config'],
      },
    },
  },
});

export const webhookSchema = new SchemaValidation('webhook', {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'WebhookConfig',
  type: 'object',
  properties: {
    $schema: { type: 'string' },
    url: { type: 'string', format: 'uri' },
    auth: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['apiKey'] },
        config: {
          type: 'object',
          properties: {
            headerName: { type: 'string' },
            value: { type: 'string' },
          },
          required: ['headerName', 'value'],
        },
      },
      required: ['type', 'config'],
    },
  },
  required: ['url'],
  additionalProperties: false,
});

export const schemas = [
  vctSchema,
  embeddedDisclosurePolicySchema,
  jwkSchema,
  authenticationSchema,
  webhookSchema,
].map((schema) => schema.getEditorSchema());
