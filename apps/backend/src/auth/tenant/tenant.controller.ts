import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
} from "@nestjs/common";
import { ApiSecurity } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin.guard";
import { ClientInitDto } from "../dto/client-init.dto";
import { Token, TokenPayload } from "../token.decorator";
import { TenantService } from "./tenant.service";

/**
 * Tenant management controller
 */
@UseGuards(AdminAuthGuard)
@ApiSecurity("oauth2")
@Controller("tenant")
export class TenantController {
    constructor(private readonly tenantService: TenantService) {}

    /**
     * Initialize a tenant for the given user.
     * @param user The user to initialize the tenant for
     * @returns
     */
    @Post()
    initTenant(@Token() user: TokenPayload, @Body() values: ClientInitDto) {
        //only the admin is allowed to init new users. Or the user by itself.
        if (values.id && !user.admin) {
            throw new ConflictException("User is not an admin");
        }
        return this.tenantService.initTenant(values.id || user.sub);
    }

    /**
     * Get the status of a tenant
     * @param id The ID of the tenant
     * @returns The status of the tenant
     */
    @Get("status")
    getTenantStatus(@Token() user: TokenPayload) {
        return this.tenantService.getTenantStatus(user.sub);
    }

    /**
     * Deletes a tenant by ID
     * @param id The ID of the tenant to delete
     */
    @Delete(":id")
    deleteTenant(@Param("id") id: string, @Token() user: TokenPayload) {
        // either self delete or the user needs to be an admin.
        if (id !== user.sub && !user.admin) {
            throw new ConflictException(
                "User is not allowed to delete this tenant",
            );
        }

        return this.tenantService.deleteTenant(id, user);
    }
}
