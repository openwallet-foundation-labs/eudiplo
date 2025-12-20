import { IsString } from "class-validator";

export class ClientCredentialsDto {
    @IsString()
    client_id!: string;
    @IsString()
    client_secret!: string;
}
