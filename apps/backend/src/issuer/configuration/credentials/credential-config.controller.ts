import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "../../../auth/roles/role.enum";
import { Secured } from "../../../auth/secure.decorator";
import { Token, TokenPayload } from "../../../auth/token.decorator";
import { CredentialConfigService } from "./credential-config/credential-config.service";
import { CredentialConfigCreate } from "./dto/credential-config-create.dto";
import { CredentialConfigUpdate } from "./dto/credential-config-update.dto";

/**
 * Controller for managing credential configurations.
 */
@ApiTags("Issuer")
@Secured([Role.Issuances])
@Controller("issuer/credentials")
export class CredentialConfigController {
    /**
     * Initializes the CredentialConfigController with the CredentialConfigService.
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
     * Returns a specific credential configuration by ID.
     * @param */
    @Get(":id")
    getConfigById(@Param("id") id: string, @Token() user: TokenPayload) {
        return this.credentialsService.getById(user.entity!.id, id);
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
     * Updates a credential configuration by ID.
     * @param id
     * @param config
     * @param user
     * @returns
     */
    @Patch(":id")
    updateCredentialConfiguration(
        @Param("id") id: string,
        @Body() config: CredentialConfigUpdate,
        @Token() user: TokenPayload,
    ) {
        return this.credentialsService.update(user.entity!.id, id, config);
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
