import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "../roles/role.enum";
import { Secured } from "../secure.decorator";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { TenantService } from "./tenant.service";

/**
 * Tenant management controller
 */
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
    initTenant(@Body() data: CreateTenantDto) {
        return this.tenantService.createTenant(data);
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
     * Deletes a tenant by ID
     * @param id The ID of the tenant to delete
     */
    @Delete(":id")
    deleteTenant(@Param("id") id: string) {
        return this.tenantService.deleteTenant(id);
    }
}
