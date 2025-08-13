import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { Token, TokenPayload } from '../../auth/token.decorator';
import { IssuanceDto } from './dto/issuance.dto';
import { IssuanceService } from './issuance.service';

@ApiTags('Issuer management')
@UseGuards(JwtAuthGuard)
@ApiSecurity('oauth2')
@Controller('issuer-management/issuance')
export class IssuanceController {
    constructor(private readonly issuanceService: IssuanceService) {}

    /**
     * Returns the issuance configurations for this tenant.
     * @returns
     */
    @Get()
    getIssuanceConfigurations(@Token() user: TokenPayload) {
        return this.issuanceService.getIssuanceConfiguration(user.sub);
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
            user.sub,
            config,
        );
    }

    /**
     * Deletes an issuance configuration.
     * @param id
     * @returns
     */
    @Delete(':id')
    deleteIssuanceConfiguration(
        @Param('id') id: string,
        @Token() user: TokenPayload,
    ) {
        return this.issuanceService.deleteIssuanceConfiguration(user.sub, id);
    }
}
