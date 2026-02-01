import { existsSync, readFileSync } from "node:fs";
import { Inject, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import { PinoLogger } from "nestjs-pino";
import { Gauge } from "prom-client";
import { Repository } from "typeorm";
import { EncryptionService } from "../../crypto/encryption/encryption.service";
import { RegistrarService } from "../../registrar/registrar.service";
import { ConfigImportOrchestratorService } from "../../shared/utils/config-import/config-import-orchestrator.service";
import { FilesService } from "../../storage/files.service";
import { CLIENTS_PROVIDER, ClientsProvider } from "../client/client.provider";
import { Role } from "../roles/role.enum";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { ImportTenantDto } from "./dto/import-tenant.dto";
import { TenantEntity } from "./entitites/tenant.entity";

// Tenant interface for service integration
export interface Tenants {
    id: string;
    secret: string;
}

@Injectable()
export class TenantService implements OnApplicationBootstrap {
    constructor(
        @Inject(CLIENTS_PROVIDER) private readonly clients: ClientsProvider,
        private readonly configService: ConfigService,
        private readonly encryptionService: EncryptionService,
        private readonly registrarService: RegistrarService,
        @InjectRepository(TenantEntity)
        private readonly tenantRepository: Repository<TenantEntity>,
        @InjectMetric("tenant_total")
        private readonly tenantTotal: Gauge<string>,
        private readonly filesService: FilesService,
        private readonly logger: PinoLogger,
        private readonly configImportOrchestrator: ConfigImportOrchestratorService,
    ) {
        // Register tenant setup - this runs first for each tenant before other imports
        this.configImportOrchestrator.registerTenantSetup(
            "tenants",
            (tenantId) => this.setupTenant(tenantId),
        );
    }

    async onApplicationBootstrap() {
        // Initialize the tenant metrics
        const count = await this.tenantRepository.count();
        this.tenantTotal.set({}, count);
    }

    /**
     * Setup a single tenant from config.
     * Creates the tenant from info.json if it doesn't exist.
     * @returns true if tenant is valid and ready for imports, false to skip this tenant
     */
    async setupTenant(tenantId: string): Promise<boolean> {
        const configPath = this.configService.getOrThrow("CONFIG_FOLDER");

        // Check if tenant already exists
        const existing = await this.tenantRepository.findOneBy({
            id: tenantId,
            status: "active",
        });

        if (existing) {
            this.logger.debug(
                `[${tenantId}] Tenant already exists, proceeding with imports`,
            );
            return true;
        }

        // Look for info.json
        const file = `${configPath}/${tenantId}/info.json`;
        if (!existsSync(file)) {
            // Skip folders without info.json - they might be for other purposes
            this.logger.warn(
                `[${tenantId}] Skipping tenant folder - no info.json found`,
            );
            return false;
        }

        try {
            const configFile = readFileSync(file, "utf-8");
            const payload = JSON.parse(configFile);

            // Validate the payload against ImportTenantDto (name, description only)
            const tenantDto = plainToClass(ImportTenantDto, payload);
            const validationErrors = await validate(tenantDto, {
                whitelist: true,
                forbidUnknownValues: false,
                forbidNonWhitelisted: false,
                stopAtFirstError: false,
            });

            if (validationErrors.length > 0) {
                this.logger.error(
                    {
                        errors: validationErrors.map((error) => ({
                            property: error.property,
                            constraints: error.constraints,
                            value: error.value,
                        })),
                    },
                    `[${tenantId}] Validation failed for tenant config`,
                );
                return false;
            }

            // ID is always derived from folder name, not from config file
            await this.createTenant({ ...tenantDto, id: tenantId });
            return true;
        } catch (error: any) {
            this.logger.error(
                `[${tenantId}] Failed to setup tenant: ${error.message}`,
            );
            return false;
        }
    }

    /**
     * Get all tenants
     * @returns A list of all tenants
     */
    getAll() {
        return this.tenantRepository.find();
    }

    /**
     * Create a new tenant.
     * @param data
     * @returns
     */
    async createTenant(data: ImportTenantDto | CreateTenantDto) {
        const tenant = await this.tenantRepository.save(data);
        await this.setUpTenant(tenant);

        if ((data as CreateTenantDto).roles) {
            await this.clients.addClient(tenant.id, {
                clientId: `${tenant.id}-admin`,
                description: `auto generated admin client for tenant ${tenant.id}`,
                roles: [
                    Role.Clients,
                    ...((data as CreateTenantDto).roles || []),
                ],
            });
        }
    }

    /**
     * Get a tenant by ID
     * @param id The ID of the tenant to retrieve
     * @returns The tenant entity
     */
    getTenant(id: string): Promise<TenantEntity> {
        return this.tenantRepository.findOneOrFail({
            where: { id },
            relations: ["clients"],
        });
    }

    /**
     * Sends an event to set up a tenant, allowing all other services to listen and react accordingly.
     * @param tenant
     */
    async setUpTenant(tenant: TenantEntity) {
        await this.encryptionService.onTenantInit(tenant.id);
        await this.registrarService.onTenantInit(tenant);
        await this.tenantRepository.update(
            { id: tenant.id },
            { status: "active" },
        );
    }

    /**
     * Update a tenant by ID
     * @param id The ID of the tenant to update
     * @param data The updated tenant data
     * @returns The updated tenant entity
     */
    async updateTenant(
        id: string,
        data: Partial<Omit<TenantEntity, "id" | "clients" | "status">>,
    ): Promise<TenantEntity> {
        await this.tenantRepository.update({ id }, data);
        return this.getTenant(id);
    }

    /**
     * Deletes a tenant by ID
     * @param tenantId The ID of the tenant to delete
     */
    async deleteTenant(tenantId: string) {
        //delete all files associated with the tenant
        await this.filesService.deleteByTenant(tenantId);
        //because of cascading, all related entities will be deleted.
        await this.tenantRepository.delete({ id: tenantId });
    }
}
