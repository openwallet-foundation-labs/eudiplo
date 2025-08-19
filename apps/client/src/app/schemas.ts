import {Uri} from 'monaco-editor';

class Schema {
  constructor(private uri: string, private schema: any) {}

  getUri() {
    return Uri.parse(`a://b/${this.uri}.json`)
  }

  getEditorSchema() {
    return {
      uri: `https://${this.uri}`,
      fileMatch: [this.getUri().toString()],
      schema: this.schema
    }
  }

  getSchema() {
    return this.schema;
  }
}

export const vctSchema = new Schema('vct', {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The name of the VCT' },
        description: { type: 'string', description: 'The description of the VCT' },
      },
      required: ['name', 'description'],
      additionalProperties: false,
    });

export const embeddedDisclosurePolicySchema = new Schema('embedded-disclosure-policy', {
      type: 'object',
      oneOf: [
        {
          title: 'AllowListPolicy',
          properties: {
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
            policy: { const: 'rootOfTrust' },
            values: { type: 'string' },
          },
          required: ['policy', 'values'],
          additionalProperties: false,
        },
        {
          title: 'AttestationBasedPolicy',
          properties: {
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
    }
  );

  export const schemas = [vctSchema, embeddedDisclosurePolicySchema].map(schema => schema.getEditorSchema());
