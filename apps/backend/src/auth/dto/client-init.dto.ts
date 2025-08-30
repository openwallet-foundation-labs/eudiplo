import { IsOptional, IsString } from "class-validator";

/**
 * Client Initialization Data Transfer Object
 */
export class ClientInitDto {
    /**
     * The unique identifier for the tenant, normally the client id that is used to authenticate.
     */
    @IsString()
    @IsOptional()
    id?: string;

    /**
     * The name of the tenant. If not set, the id will be used as the name.
     */
    @IsString()
    @IsOptional()
    name: string;
}
