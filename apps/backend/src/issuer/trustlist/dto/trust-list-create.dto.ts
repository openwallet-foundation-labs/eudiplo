import { OmitType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";
import { TrustList } from "../entities/trust-list.entity";

export class TrustListEntity {
    @IsString()
    issuerCertId: string;

    @IsString()
    revocationCertId: string;
}

/**
 * DTO for creating a new Trust List, omitting tenant-related fields and ID.
 */
export class TrustListCreateDto extends OmitType(TrustList, [
    "tenant",
    "tenantId",
    "jwt",
    "cert",
    "certId",
] as const) {
    @IsString()
    @IsOptional()
    certId?: string;

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => TrustListEntity)
    entities: TrustListEntity[];
}
