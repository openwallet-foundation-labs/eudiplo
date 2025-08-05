import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a new credential-issuance binding.
 */
export class CreateCredentialIssuanceBindingDto {
    @ApiProperty({
        description: 'The ID of the credential configuration',
        example: 'university-degree',
    })
    @IsString()
    credentialConfigId: string;

    @ApiProperty({
        description: 'The ID of the issuance configuration',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    issuanceConfigId: string;

    @ApiProperty({
        description:
            'The key ID to use for signing this credential in this issuance config',
        example: 'signing-key-2024-01',
    })
    @IsString()
    keyID: string;
}

/**
 * DTO for updating the key ID of an existing binding.
 */
export class UpdateCredentialIssuanceBindingDto {
    @ApiProperty({
        description: 'The new key ID to use for signing this credential',
        example: 'signing-key-2024-02',
    })
    @IsString()
    keyID: string;
}

/**
 * DTO for the response of a credential-issuance binding.
 */
export class CredentialIssuanceBindingResponseDto {
    @ApiProperty({
        description: 'The unique identifier of the binding',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    id: string;

    @ApiProperty({
        description: 'The ID of the credential configuration',
        example: 'university-degree',
    })
    credentialConfigId: string;

    @ApiProperty({
        description: 'The ID of the issuance configuration',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    issuanceConfigId: string;

    @ApiProperty({
        description: 'The key ID used for signing this credential',
        example: 'signing-key-2024-01',
    })
    keyID: string;

    @ApiProperty({
        description: 'The timestamp when the binding was created',
        example: '2024-08-03T10:30:00Z',
    })
    createdAt: Date;
}
