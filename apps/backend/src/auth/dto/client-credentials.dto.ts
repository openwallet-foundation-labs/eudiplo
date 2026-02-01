import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class ClientCredentialsDto {
    @ApiPropertyOptional({ default: "client_credentials" })
    @IsOptional()
    @IsString()
    grant_type?: string;

    @IsString()
    client_id!: string;

    @IsString()
    client_secret!: string;
}
