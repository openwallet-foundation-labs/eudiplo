import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";

export class TokenRequestDto {
    @ApiProperty({
        description: "The grant type",
        enum: ["client_credentials"],
        examples: ["client_credentials"],
    })
    @IsString()
    @IsIn(["client_credentials"])
    grant_type: "client_credentials";

    @ApiProperty({
        description: "The client identifier",
        examples: ["my-client-id"],
    })
    @IsString()
    client_id: string;

    @ApiProperty({
        description: "The client secret",
        examples: ["my-client-secret"],
    })
    @IsString()
    client_secret: string;

    @ApiProperty({
        description: "The scope of the access request",
        examples: ["openid"],
        required: false,
    })
    scope?: string;
}
