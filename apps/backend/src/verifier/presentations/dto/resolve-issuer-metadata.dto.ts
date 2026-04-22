import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUrl } from "class-validator";

export class ResolveIssuerMetadataDto {
    @ApiProperty({
        description:
            "Issuer URL or full OpenID4VCI metadata URL to resolve server-side.",
        example: "https://issuer.example.com/issuers/tenant-a",
    })
    @IsString()
    @IsUrl({ require_tld: false })
    issuerUrl!: string;
}
