import { Type } from "class-transformer";
import {
    IsArray,
    IsObject,
    IsOptional,
    IsString,
    ValidateIf,
    ValidateNested,
} from "class-validator";

export class RegistrationCertificatePurpose {
    @IsString()
    lang!: string;

    @IsString()
    content!: string;
}

export class RegistrationCertificateBody {
    @IsOptional()
    @IsString()
    privacy_policy?: string;

    @IsOptional()
    @IsString()
    support_uri?: string;

    @IsOptional()
    @IsString()
    intermediary?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RegistrationCertificatePurpose)
    purpose?: RegistrationCertificatePurpose[];

    @IsOptional()
    @IsArray()
    @IsObject({ each: true })
    credentials?: Record<string, unknown>[];

    @IsOptional()
    @IsArray()
    @IsObject({ each: true })
    provided_attestations?: Record<string, unknown>[];
}

/**
 * RegistrationCertificateRequest DTO
 */
export class RegistrationCertificateRequest {
    /**
     * Optional registrar-side certificate identifier.
     * If provided and still valid, EUDIPLO reuses it instead of creating a new certificate.
     */
    @IsOptional()
    @IsString()
    id?: string;

    /**
     * Registration certificate creation payload.
     * This is merged with tenant-level registrar defaults when a certificate is created.
     */
    @ValidateIf((o) => !o.jwt)
    @IsObject()
    @ValidateNested()
    @Type(() => RegistrationCertificateBody)
    body?: RegistrationCertificateBody;

    /**
     * Optional pre-existing registration certificate JWT.
     * If provided, EUDIPLO forwards it as-is and does not create a new one.
     */
    @ValidateIf((o) => !o.body)
    @IsOptional()
    @IsString()
    jwt?: string;
}
