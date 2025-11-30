import {
    Inject,
    Injectable,
    OnApplicationBootstrap,
    OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import { existsSync, readdirSync, readFileSync } from "fs";
import { PinoLogger } from "nestjs-pino";
import { Gauge } from "prom-client";
import { Repository } from "typeorm";
import { CryptoService } from "../../crypto/crypto.service";
import { EncryptionService } from "../../crypto/encryption/encryption.service";
import { StatusListService } from "../../issuer/status-list/status-list.service";
import { RegistrarService } from "../../registrar/registrar.service";
import { FilesService } from "../../storage/files.service";
import { CLIENTS_PROVIDER, ClientsProvider } from "../client/client.provider";
import { Role } from "../roles/role.enum";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { TenantEntity } from "./entitites/tenant.entity";

// Tenant interface for service integration
export interface Tenants {
    id: string;
    secret: string;
}

@Injectable()
export class TenantService implements OnApplicationBootstrap, OnModuleInit {
    constructor(
        @Inject(CLIENTS_PROVIDER) private clients: ClientsProvider,
        private configService: ConfigService,
        private cryptoService: CryptoService,
        private encryptionService: EncryptionService,
        private statusListService: StatusListService,
        private registrarService: RegistrarService,
        @InjectRepository(TenantEntity)
        private tenantRepository: Repository<TenantEntity>,
        @InjectMetric("tenant_total")
        private tenantTotal: Gauge<string>,
        private filesService: FilesService,
        private logger: PinoLogger,
    ) {}

    async onModuleInit() {
        if (this.configService.get<boolean>("CONFIG_IMPORT")) {
            const configPath = this.configService.getOrThrow("CONFIG_FOLDER");
            if (this.configService.get<boolean>("CONFIG_IMPORT")) {
                const tenantFolders = readdirSync(configPath, {
                    withFileTypes: true,
                }).filter((tenant) => tenant.isDirectory());
                for (const tenant of tenantFolders) {
                    const setUp = await this.tenantRepository.findOneBy({
                        id: tenant.name,
                        status: "active",
                    });
                    if (!setUp) {
                        const file = `${configPath}/${tenant.name}/info.json`;
                        if (!existsSync(file)) {
                            // throw an eror because we need the tenant info file to set up the tenant.
                            throw new Error(
                                `Tenant config file not found for tenant ${tenant.name} in ${file}`,
                            );
                        }
                        const configFile = readFileSync(file, "utf-8");
                        const payload = JSON.parse(configFile);
                        payload.id = tenant.name;
                        // Validate the payload against CreateTenantDto
                        const tenantDto = plainToClass(
                            CreateTenantDto,
                            payload,
                        );
                        const validationErrors = await validate(tenantDto, {
                            whitelist: true,
                            forbidUnknownValues: false, // avoid false positives on plain objects
                            forbidNonWhitelisted: false,
                            stopAtFirstError: false,
                        });
                        if (validationErrors.length > 0) {
                            this.logger.error(
                                {
                                    event: "ValidationError",
                                    file,
                                    tenant: tenant.name,
                                    errors: validationErrors.map((error) => ({
                                        property: error.property,
                                        constraints: error.constraints,
                                        value: error.value,
                                    })),
                                },
                                `Validation failed for tenant config ${file} in tenant ${tenant.name}: ${JSON.stringify(validationErrors, null, 2)}`,
                            );
                        } else {
                            await this.createTenant(tenantDto);
                        }
                    }
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
    async createTenant(data: CreateTenantDto) {
        const tenant = await this.tenantRepository.save(data);
        await this.setUpTenant(tenant);
        // only add the tenant when the auth user is not assigned to this tenant.
        const authTenant = this.configService.get<string>("AUTH_CLIENT_TENANT");
        if (authTenant !== tenant.id) {
            await this.clients.addClient(tenant.id, {
                clientId: `${tenant.id}-admin`,
                description: `auto generated admin client for tenant ${tenant.id}`,
                roles: [Role.Clients, ...(data.roles || [])],
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
        await this.cryptoService.onTenantInit(tenant);
        await this.encryptionService.onTenantInit(tenant.id);
        await this.statusListService.onTenantInit(tenant.id);
        await this.registrarService.onTenantInit(tenant);
        await this.tenantRepository.update(
            { id: tenant.id },
            { status: "active" },
        );
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
