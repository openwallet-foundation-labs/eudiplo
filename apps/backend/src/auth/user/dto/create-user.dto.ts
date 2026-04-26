import { ApiProperty, ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import {
    IsBoolean,
    IsEmail,
    IsOptional,
    IsString,
    MinLength,
} from "class-validator";
import { ManagedUserDto } from "./managed-user.dto";

export class CreateUserDto extends OmitType(ManagedUserDto, [
    "id",
    "tenantId",
    "enabled",
] as const) {
    @ApiProperty({ example: "alice" })
    @IsString()
    @MinLength(1)
    override username!: string;

    @ApiProperty({ example: "S3cur3P@ssword" })
    @IsString()
    @MinLength(8)
    password!: string;

    @ApiPropertyOptional({ example: "alice@example.com" })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: "Alice" })
    @IsOptional()
    @IsString()
    override firstName?: string;

    @ApiPropertyOptional({ example: "Admin" })
    @IsOptional()
    @IsString()
    override lastName?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;
}
