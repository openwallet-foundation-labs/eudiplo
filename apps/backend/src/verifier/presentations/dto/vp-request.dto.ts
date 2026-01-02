import { IsString } from "class-validator";

/**
 * RegistrationCertificateRequest DTO
 */
export class RegistrationCertificateRequest {
    /**
     * The body of the registration certificate request containing the necessary details.
     */
    //@IsObject()
    //body!: RegistrationCertificateCreation;

    /**
     * Registration certificate JWT
     */
    @IsString()
    jwt: string;
}
