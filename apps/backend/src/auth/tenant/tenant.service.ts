import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    OnApplicationBootstrap,
    OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { readdirSync } from "fs";
import { Gauge } from "prom-client";
import { Repository } from "typeorm/repository/Repository";
import { CryptoService } from "../../crypto/crypto.service";
import { EncryptionService } from "../../crypto/encryption/encryption.service";
import { Oid4vciService } from "../../issuer/oid4vci/oid4vci.service";
import { StatusListService } from "../../issuer/status-list/status-list.service";
import { RegistrarService } from "../../registrar/registrar.service";
import { FilesService } from "../../storage/files.service";
import { TenantEntity } from "../entitites/tenant.entity";
import { TokenPayload } from "../token.decorator";

// Tenant interface for service integration
export interface Tenants {
    id: string;
    secret: string;
}

@Injectable()
export class TenantService implements OnApplicationBootstrap, OnModuleInit {
    private tenants: Tenants[] | null = null;

    constructor(
        private configService: ConfigService,
        private cryptoService: CryptoService,
        private encryptionService: EncryptionService,
        private statusListService: StatusListService,
        private registrarService: RegistrarService,
        private oid4vciService: Oid4vciService,
        @InjectRepository(TenantEntity)
        private tenantRepository: Repository<TenantEntity>,
        @InjectMetric("tenant_total")
        private tenantTotal: Gauge<string>,
        private filesService: FilesService,
    ) {}

    async onModuleInit() {
        if (this.configService.get<boolean>("CONFIG_IMPORT")) {
            const configPath = this.configService.getOrThrow("CONFIG_FOLDER");
            if (this.configService.get<boolean>("CONFIG_IMPORT")) {
                const tenantFolders = readdirSync(configPath, {
                    withFileTypes: true,
                }).filter((tenant) => tenant.isDirectory());
                for (const tenant of tenantFolders) {
                    await this.tenantRepository.save({ id: tenant.name });
                }
            }
        }
    }

    async onApplicationBootstrap() {
        // Initialize the tenant metrics
        const count = await this.tenantRepository.count();
        this.tenantTotal.set({}, count);
    }

    /**
     * Initialize a tenant for the given user.
     * @param user The user to initialize the tenant for
     */
    async initTenant(id: string) {
        await this.tenantRepository.save({ id });
        return this.setUpTenant(id);
    }

    async getTenantStatus(id: string) {
        const tenant = await this.tenantRepository.findOneBy({ id });
        if (!tenant) {
            throw new NotFoundException(`Tenant ${id} not found`);
        }
        return tenant;
    }

    /**
     * Get tenants from configuration
     * @returns
     */
    private getTenants(): Tenants[] {
        if (!this.tenants) {
            this.tenants = this.loadTenants();
        }
        return this.tenants;
    }

    /**
     * Load tenants from configuration
     */
    private loadTenants(): Tenants[] {
        // Default tenants for development/testing
        return [
            {
                id: this.configService.getOrThrow<string>("AUTH_CLIENT_ID"),
                secret: this.configService.getOrThrow<string>(
                    "AUTH_CLIENT_SECRET",
                ),
            },
        ];
    }

    /**
     * Validate tenant credentials (OAuth2 Tenant Credentials flow)
     * This is the primary authentication method for service integration
     */
    validateTenant(tenantId: string, tenantSecret: string): Tenants | null {
        const tenant = this.getTenants().find((c) => c.id === tenantId);

        if (!tenant || tenant.secret !== tenantSecret) {
            return null;
        }

        return tenant;
    }

    /**
     * Find tenant by ID
     */
    findTenantById(tenantId: string): Tenants | null {
        return this.getTenants().find((c) => c.id === tenantId) || null;
    }

    /**
     * Sends an event to set up a tenant, allowing all other services to listen and react accordingly.
     * @param id
     */
    async setUpTenant(id: string) {
        await this.cryptoService.onTenantInit(id);
        await this.encryptionService.onTenantInit(id);
        await this.statusListService.onTenantInit(id);
        await this.registrarService.onTenantInit(id);
        await this.oid4vciService.onTenantInit(id);
        await this.tenantRepository.update({ id }, { status: "active" });
    }

    /**
     * Deletes a tenant by ID
     * @param tenantId The ID of the tenant to delete
     * @param user The user requesting the deletion
     */
    async deleteTenant(tenantId: string, user: TokenPayload) {
        if (tenantId !== user.sub) {
            throw new ForbiddenException(
                `User ${user.sub} is not allowed to delete tenant ${tenantId}`,
            );
        }
        //delete all files associated with the tenant
        await this.filesService.deleteByTenant(tenantId);
        //because of cascading, all related entities will be deleted.
        await this.tenantRepository.delete({ id: tenantId });
    }
}
