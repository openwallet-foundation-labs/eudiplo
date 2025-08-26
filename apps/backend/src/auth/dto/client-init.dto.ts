import { IsOptional, IsString } from "class-validator";

export class ClientInitDto {
    @IsString()
    @IsOptional()
    id?: string;
}
