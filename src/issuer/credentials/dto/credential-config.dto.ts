import { CredentialConfigurationSupported } from '@openid4vc/openid4vci';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { SchemaResponse } from './schema-response.dto';
import { WebhookConfig } from 'src/utils/webhook.dto';

export class VCT {
    @IsString()
    vct: string;
    @IsString()
    name?: string;
    @IsString()
    description?: string;
    @IsString()
    extends?: string;
    @IsString()
    'extends#integrity'?: string;
    @IsString()
    schema_uri?: string;
    @IsString()
    'schema_uri#integrity'?: string;
}

export class PresentationDuringIssuance {
    @IsString()
    type: string;
    @IsObject()
    webhook?: WebhookConfig;
}
export class CredentialConfig {
    @IsString()
    @IsOptional()
    '$schema'?: string;
    @IsString()
    id: string;
    @IsObject()
    config: CredentialConfigurationSupported;
    @IsObject()
    claims: Record<string, any>;
    @IsObject()
    disclosureFrame: Record<string, any>;
    @IsObject()
    @IsOptional()
    vct?: VCT;
    @IsObject()
    @IsOptional()
    presentation_during_issuance?: PresentationDuringIssuance;
    @IsObject()
    @IsOptional()
    schema: SchemaResponse;
}
