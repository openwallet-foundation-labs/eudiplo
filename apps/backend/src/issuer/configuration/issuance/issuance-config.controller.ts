import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "../../../auth/roles/role.enum";
import { Secured } from "../../../auth/secure.decorator";
import { Token, TokenPayload } from "../../../auth/token.decorator";
import { IssuanceDto } from "./dto/issuance.dto";
import { IssuanceService } from "./issuance.service";

@ApiTags("Issuer")
@Secured([Role.Issuances])
@Controller("issuer/config")
export class IssuanceConfigController {
    constructor(private readonly issuanceService: IssuanceService) {}

    /**
     * Returns the issuance configurations for this tenant.
     * @returns
     */
    @Get()
    getIssuanceConfigurations(@Token() user: TokenPayload) {
        return this.issuanceService.getIssuanceConfiguration(user.entity!.id);
    }

    /**
     * Stores the issuance configuration for this tenant.
     * @param config
     * @returns
     */
    @Post()
    storeIssuanceConfiguration(
        @Body() config: IssuanceDto,
        @Token() user: TokenPayload,
    ) {
        return this.issuanceService.storeIssuanceConfiguration(
            user.entity!.id,
            config,
        );
    }
}
