import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
} from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/auth.guard";
import { Token, TokenPayload } from "../../auth/token.decorator";
import { CredentialConfigService } from "./credential-config/credential-config.service";
import { CredentialConfigCreate } from "./dto/credential-config-create.dto";

/**
 * Controller for managing credential configurations.
 */
@ApiTags("Issuer management")
@UseGuards(JwtAuthGuard)
@ApiSecurity("oauth2")
@Controller("issuer-management/credentials")
export class CredentialsController {
    /**
     * Initializes the CredentialsController with the CredentialConfigService.
     * @param credentialsService
     */
    constructor(private readonly credentialsService: CredentialConfigService) {}

    /**
     * Returns the credential configurations for this tenant.
     * @returns
     */
    @Get()
    getConfigs(@Token() user: TokenPayload) {
        return this.credentialsService.get(user.sub);
    }

    /**
     * Stores the credential configuration for this tenant.
     * @param config
     * @returns
     */
    @Post()
    storeCredentialConfiguration(
        @Body() config: CredentialConfigCreate,
        @Token() user: TokenPayload,
    ) {
        return this.credentialsService.store(user.sub, config);
    }

    /**
     * Deletes an credential configuration.
     * @param id
     * @returns
     */
    @Delete(":id")
    deleteIssuanceConfiguration(
        @Param("id") id: string,
        @Token() user: TokenPayload,
    ) {
        return this.credentialsService.delete(user.sub, id);
    }
}
