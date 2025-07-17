import { Controller, Get, Param } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Credentials')
@Controller('credentials/:tenantId')
export class CredentialsController {
    constructor(private readonly credentialsService: CredentialsService) {}

    /**
     * Retrieves the VCT (Verifiable Credential Type) from the credentials service.
     * @param id - The identifier of the credential configuration.
     */
    @Get('vct/:id')
    vct(@Param('id') id: string, @Param('tenantId') tenantId: string) {
        return this.credentialsService.getVCT(id, tenantId);
    }

    /**
     * Retrieves the schema for a specific credential
     * @param id
     * @returns
     */
    @Get('schema/:id')
    schema(@Param('id') id: string, @Param('tenantId') tenantId: string) {
        return this.credentialsService.getSchema(id, tenantId);
    }
}
