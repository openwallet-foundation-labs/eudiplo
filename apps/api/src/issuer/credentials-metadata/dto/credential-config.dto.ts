import { IsObject, IsString } from 'class-validator';
import { WebhookConfig } from '../../../utils/webhook/webhook.dto';

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
