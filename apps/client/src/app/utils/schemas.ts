import embeddedDisclosurePolicySchemaObj from '../../../../../schemas/EmbeddedDisclosurePolicy.schema.json';
import vctSchemaObj from '../../../../../schemas/VCT.schema.json';
import jwkSchemaObj from '../../../../../schemas/Key.schema.json';
import webhookSchemaObj from '../../../../../schemas/WebhookConfig.schema.json';
import credentialConfigSchemaObj from '../../../../../schemas/CredentialConfigCreate.schema.json';
import issuanceConfigSchemaObj from '../../../../../schemas/IssuanceDto.schema.json';
import registrationCertificateRequestObj from '../../../../../schemas/RegistrationCertificateRequest.schema.json';
import DCQLObj from '../../../../../schemas/DCQL.schema.json';
import presnetationConfigCreateSchemaObj from '../../../../../schemas/PresentationConfigCreateDto.schema.json';

export class SchemaValidation {
  constructor(private schema: any) {}

  getSchemaUrl() {
    return this.schema['$id'];
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
