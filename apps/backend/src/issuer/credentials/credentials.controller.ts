import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { Role } from "../../auth/roles/role.enum";
import { Secured } from "../../auth/secure.decorator";
import { Token, TokenPayload } from "../../auth/token.decorator";
import { CredentialConfigService } from "./credential-config/credential-config.service";
import { CredentialConfigCreate } from "./dto/credential-config-create.dto";

/**
 * Controller for managing credential configurations.
 */
@Secured([Role.Issuances])
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
        return this.credentialsService.get(user.entity!.id);
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
        return this.credentialsService.store(user.entity!.id, config);
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
        return this.credentialsService.delete(user.entity!.id, id);
    }
}
