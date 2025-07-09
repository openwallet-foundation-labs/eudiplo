import { Controller, Get, Param } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('credentials')
@Controller('credentials')
export class CredentialsController {
    constructor(private readonly credentialsService: CredentialsService) {}

    /**
     * Retrieves the VCT (Verifiable Credential Type) from the credentials service.
     * @param id - The identifier of the credential configuration.
     */
    @Get('vct/:id')
    vct(@Param('id') id: string) {
        return this.credentialsService.getVCT(id);
    }

    /**
     * Retrieves the schema for a specific credential
     * @param id
     * @returns
     */
    @Get('schema/:id')
    schema(@Param('id') id: string) {
        return this.credentialsService.getSchema(id);
    }
}
