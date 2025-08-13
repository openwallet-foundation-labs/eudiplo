import { IsOptional, IsString } from 'class-validator';

export class AuthorizeQueries {
    @IsOptional()
    @IsString()
    issuer_state?: string;
    @IsOptional()
    @IsString()
    response_type?: string;
    @IsOptional()
    @IsString()
    client_id?: string;
    @IsOptional()
    @IsString()
    redirect_uri?: string;
    @IsOptional()
    @IsString()
    resource?: string;
    @IsOptional()
    @IsString()
    scope?: string;
    @IsOptional()
    @IsString()
    code_challenge?: string;
    @IsOptional()
    @IsString()
    code_challenge_method?: string;
    @IsOptional()
    @IsString()
    dpop_jkt?: string;
    @IsOptional()
    @IsString()
    request_uri?: string;
    @IsOptional()
    @IsString()
    auth_session?: string;
}
