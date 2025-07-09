import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import { CredentialConfig } from '../credentials/dto/credential-config.dto';
import { ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../auth/api-key-guard';

@UseGuards(ApiKeyGuard)
@ApiSecurity('apiKey')
@Controller('issuer-managment')
export class IssuerManagmentController {
    constructor(private readonly credentialsService: CredentialsService) {}

    /**
     * Returns the credential configuration for all supported credentials.
     * @returns
     */
    @Get('config')
    configuration() {
        return this.credentialsService.getConfig();
    }

    /**
     * Stores a credential configuration. If it already exists, it will be updated.
     * @param config
     * @returns
     */
    @Post('config')
    storeConfiguration(@Body() config: CredentialConfig) {
        return this.credentialsService.storeCredentialConfiguration(config);
    }

    /**
     * Deletes a credential configuration by its ID.
     * @param id
     * @returns
     */
    @Delete('config/:id')
    deleteConfiguration(@Param('id') id: string) {
        return this.credentialsService.deleteCredentialConfiguration(id);
    }
}
