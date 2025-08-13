import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class StatusUpdateDto {
    /**
     * The session ID of the user
     */
    @IsString()
    sessionId: string;

    /**
     * The ID of the credential configuration
     * This is optional, if not provided, all credentials will be revoked of the session.
     */
    @IsString()
    @IsOptional()
    credentialConfigurationId?: string;

    /**
     * The status of the credential
     * 0 = valid, 1 = revoked
     */
    @IsNumber()
    @IsIn([0, 1])
    status: number;
}
