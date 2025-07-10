import { IsObject, IsString } from 'class-validator';
import { RegistrationCertificateCreation } from '../../../registrar/generated';
import { WebhookConfig } from 'src/utils/webhook.dto';

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

export class VPRequest {
    /**
     * Unique identifier for the VP request.
     */
    @IsString()
    id: string;
    /**
     * The DCQL query to be used for the VP request.
     */
    @IsObject()
    dcql_query: any;
    @IsObject()
    /**
     * The registration certificate request containing the necessary details.
     */
    registrationCert: RegistrationCertificateRequest;
    /**
     * Optional webhook URL to receive the response.
     */
    @IsObject()
    webhook?: WebhookConfig;
}
