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
import { ApiExtraModels, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Role } from "../roles/role.enum";
import { Secured } from "../secure.decorator";
import { Token, TokenPayload } from "../token.decorator";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { ImportTenantDto } from "./dto/import-tenant.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";
import { TenantService } from "./tenant.service";

/**
 * Tenant management controller
 */
@ApiExtraModels(ImportTenantDto)
@ApiTags("Tenant")
@Secured([Role.Tenants])
@Controller("tenant")
export class TenantController {
    constructor(private readonly tenantService: TenantService) {}

    /**
     * Get all tenants
     * @returns
     */
    @Get()
    getTenants() {
        return this.tenantService.getAll();
    }

    /**
     * Initialize a tenant
     * @param data
     * @returns
     */
    @Post()
    initTenant(
        @Body() data: CreateTenantDto,
        @Token() token: TokenPayload,
        @Req() req: Request,
    ) {
        return this.tenantService.createTenant(data, token, req);
    }

    /**
     * Get a tenant by ID
     * @param id The ID of the tenant
     * @returns The tenant
     */
    @Get(":id")
    getTenant(@Param("id") id: string) {
        return this.tenantService.getTenant(id);
    }

    /**
     * Update a tenant by ID
     * @param id The ID of the tenant
     * @param data The updated tenant data
     * @returns The updated tenant
     */
    @Patch(":id")
    updateTenant(
        @Param("id") id: string,
        @Body() data: UpdateTenantDto,
        @Token() token: TokenPayload,
        @Req() req: Request,
    ) {
        return this.tenantService.updateTenant(id, data, token, req);
    }

    /**
     * Deletes a tenant by ID
     * @param id The ID of the tenant to delete
     */
    @Delete(":id")
    deleteTenant(
        @Param("id") id: string,
        @Token() token: TokenPayload,
        @Req() req: Request,
    ) {
        return this.tenantService.deleteTenant(id, token, req);
    }
}
