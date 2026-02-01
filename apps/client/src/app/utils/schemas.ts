import embeddedDisclosurePolicySchemaObj from '../../../../../schemas/EmbeddedDisclosurePolicy.schema.json';
import vctSchemaObj from '../../../../../schemas/VCT.schema.json';
import jwkSchemaObj from '../../../../../schemas/Key.schema.json';
import webhookSchemaObj from '../../../../../schemas/WebhookConfig.schema.json';
import credentialConfigSchemaObj from '../../../../../schemas/CredentialConfigCreate.schema.json';
import issuanceConfigSchemaObj from '../../../../../schemas/IssuanceDto.schema.json';
import registrationCertificateRequestObj from '../../../../../schemas/RegistrationCertificateRequest.schema.json';
import DCQLObj from '../../../../../schemas/DCQL.schema.json';
import presnetationConfigCreateSchemaObj from '../../../../../schemas/PresentationConfigCreateDto.schema.json';
import transactionDataSchemaObj from '../../../../../schemas/TransactionData.schema.json';

// Create an array schema for TransactionData (URI-based matching allows arrays as root)
const transactionDataArraySchemaObj = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://raw.githubusercontent.com/openwallet-foundation-labs/eudiplo/refs/heads/main/schemas/TransactionDataArray.schema.json',
  title: 'TransactionDataArray',
  type: 'array',
  items: transactionDataSchemaObj,
};

export class SchemaValidation {
  constructor(private schema: any) {}

  getSchemaUrl() {
    return this.schema['$id'];
  }

  /**
   * Get the fileMatch URI pattern for Monaco editor model.
   * This allows Monaco to auto-apply the schema without needing $schema in the content.
   * Uses format: a://b/{SchemaName}.schema.json to match schemas.json fileMatch patterns.
   */
  getFileMatchUri(): string {
    const schemaId = this.schema['$id'] || '';
    const fileName = schemaId.split('/').pop() || 'unknown.schema.json';
    return `a://b/${fileName}`;
  }
}

export const vctSchema = new SchemaValidation(vctSchemaObj);
export const embeddedDisclosurePolicySchema = new SchemaValidation(
  embeddedDisclosurePolicySchemaObj
);
export const jwkSchema = new SchemaValidation(jwkSchemaObj);
export const webhookSchema = new SchemaValidation(webhookSchemaObj);
export const credentialConfigSchema = new SchemaValidation(credentialConfigSchemaObj);
export const issuanceConfigSchema = new SchemaValidation(issuanceConfigSchemaObj);

export const presentationConfigSchema = new SchemaValidation(presnetationConfigCreateSchemaObj);

export const registrationCertificateRequestSchema = new SchemaValidation(
  registrationCertificateRequestObj
);

export const DCQLSchema = new SchemaValidation(DCQLObj);

export const transactionDataArraySchema = new SchemaValidation(transactionDataArraySchemaObj);
