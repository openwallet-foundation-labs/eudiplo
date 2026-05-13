import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
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
    constructor(private readonly credentialsService: CredentialConfigService) {}

    @Get()
    getConfigs(@Token() user: TokenPayload) {
        return this.credentialsService.get(user.entity!.id);
    }

    @Get(":id")
    getConfigById(@Param("id") id: string, @Token() user: TokenPayload) {
        return this.credentialsService.getById(user.entity!.id, id);
    }

    @Post()
    storeCredentialConfiguration(
        @Body() config: CredentialConfigCreate,
        @Token() user: TokenPayload,
        @Req() req: Request,
    ) {
        return this.credentialsService.store(
            user.entity!.id,
            config,
            false,
            user,
            req,
        );
    }

    @Patch(":id")
    updateCredentialConfiguration(
        @Param("id") id: string,
        @Body() config: CredentialConfigUpdate,
        @Token() user: TokenPayload,
        @Req() req: Request,
    ) {
        return this.credentialsService.update(
            user.entity!.id,
            id,
            config,
            user,
            req,
        );
    }

    @Delete(":id")
    deleteIssuanceConfiguration(
        @Param("id") id: string,
        @Token() user: TokenPayload,
        @Req() req: Request,
    ): Promise<unknown> {
        return this.credentialsService.delete(user.entity!.id, id, user, req);
    }
}
