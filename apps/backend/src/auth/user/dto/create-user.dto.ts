import { ApiProperty, ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    MinLength,
} from "class-validator";
import { Role } from "../../roles/role.enum";
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

    @ApiProperty({ enum: Role, isArray: true })
    @IsArray()
    @IsEnum(Role, { each: true })
    override roles!: Role[];

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;
}
