import { ApiProperty } from "@nestjs/swagger";

export class TokenResponseDto {
    @ApiProperty({
        description: "The access token",
        examples: ["eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."],
    })
    access_token: string;

    @ApiProperty({
        description: "The type of the token",
        examples: ["Bearer"],
    })
    token_type: "Bearer";

    @ApiProperty({
        description: "The lifetime in seconds of the access token",
        examples: [3600],
    })
    expires_in: number;

    @ApiProperty({
        description: "The scope of the access token",
        examples: ["openid"],
        required: false,
    })
    scope?: string;
}
