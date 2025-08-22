import { Uri } from 'monaco-editor';
import embeddedDisclosurePolicySchemaObj from './schemas/embedded-disclosure-policy.json';
import vctSchemaObj from './schemas/vct.json';
import jwkSchemaObj from '../../../../../schemas/Key.schema.json';
import authenticationSchemaObj from './schemas/authentication.json';
import webhookSchemaObj from '../../../../../schemas/WebhookConfig.schema.json';

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
export const authenticationSchema = new SchemaValidation('authentication', authenticationSchemaObj);
export const webhookSchema = new SchemaValidation('webhook', webhookSchemaObj);

export const schemas = [
  vctSchema,
  embeddedDisclosurePolicySchema,
  jwkSchema,
  authenticationSchema,
  webhookSchema,
].map((schema) => schema.getEditorSchema());
