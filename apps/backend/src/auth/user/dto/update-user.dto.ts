import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";
import { CreateUserDto } from "./create-user.dto";

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiPropertyOptional({ example: "S3cur3P@ssword" })
    @IsOptional()
    @IsString()
    @MinLength(8)
    password?: string;
}
