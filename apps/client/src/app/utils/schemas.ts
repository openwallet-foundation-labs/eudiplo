import { Uri } from 'monaco-editor';
import embeddedDisclosurePolicySchemaObj from '../../../../../schemas/EmbeddedDisclosurePolicy.schema.json';
import vctSchemaObj from '../../../../../schemas/VCT.schema.json';
import jwkSchemaObj from '../../../../../schemas/Key.schema.json';
import webhookSchemaObj from '../../../../../schemas/WebhookConfig.schema.json';
import credentialConfigSchemaObj from '../../../../../schemas/CredentialConfigCreate.schema.json';
import issuanceConfigSchemaObj from '../../../../../schemas/IssuanceDto.schema.json';

export class SchemaValidation {
  constructor(
    private uri: string,
    private schema: any
  ) {}

  getUri() {
    return Uri.parse(`a://b/${this.uri}.json`);
  }

  getSchemaUrl() {
    return this.schema['$id'];
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

export const vctSchema = new SchemaValidation('vct', vctSchemaObj);
export const embeddedDisclosurePolicySchema = new SchemaValidation(
  'embedded-disclosure-policy',
  embeddedDisclosurePolicySchemaObj
);
export const jwkSchema = new SchemaValidation('jwk', jwkSchemaObj);
export const webhookSchema = new SchemaValidation('webhook', webhookSchemaObj);
export const credentialConfigSchema = new SchemaValidation(
  'credential-config',
  credentialConfigSchemaObj
);
export const issuanceConfigSchema = new SchemaValidation(
  'issuance-config',
  issuanceConfigSchemaObj
);
