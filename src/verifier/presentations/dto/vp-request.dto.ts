import { IsObject, IsString } from 'class-validator';
import { RegistrationCertificateCreation } from '../../../registrar/generated';

export class RegistrationCertificateRequest {
  id?: string;
  @IsObject()
  body: RegistrationCertificateCreation;
}

export class VPRequest {
  id: string;
  @IsObject()
  dcql_query: any;
  @IsObject()
  registrationCert: RegistrationCertificateRequest;
  @IsString()
  webhook?: string;
}
