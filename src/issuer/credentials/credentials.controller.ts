import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { ApiTags } from '@nestjs/swagger';
import { CredentialConfig } from './dto/credential-config.dto';

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
