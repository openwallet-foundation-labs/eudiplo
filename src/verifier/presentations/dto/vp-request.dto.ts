import { IsObject, IsString } from 'class-validator';
import { RegistrationCertificateCreation } from '../../../registrar/generated';

export class RegistrationCertificateRequest {
    /**
     * Identifier of the registration certificate that got issued.
     */
    @IsString()
    id?: string;
    /**
     * The body of the registration certificate request containing the necessary details.
     */
    @IsObject()
    body: RegistrationCertificateCreation;
}
