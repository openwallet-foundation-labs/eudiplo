import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { Repository } from "typeorm";
import { ConfigImportService } from "../../../shared/utils/config-import/config-import.service";
import { ConfigImportOrchestratorService } from "../../../shared/utils/config-import/config-import-orchestrator.service";
import { Role } from "../../roles/role.enum";
import { ClientsProvider } from "../client.provider";
import { CreateClientDto } from "../dto/create-client.dto";
import { UpdateClientDto } from "../dto/update-client.dto";
import { ClientEntity } from "../entities/client.entity";

@Injectable()
export class InternalClientsProvider
    extends ClientsProvider
    implements OnApplicationBootstrap
{
    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(ClientEntity)
        private readonly repo: Repository<ClientEntity>,
        private readonly configImportService: ConfigImportService,
        configImportOrchestrator: ConfigImportOrchestratorService,
    ) {
        super(configImportOrchestrator);
    }

    async onApplicationBootstrap() {
        //add the root user
        const clientId = this.configService.getOrThrow("AUTH_CLIENT_ID");
        const clientSecret =
            this.configService.getOrThrow("AUTH_CLIENT_SECRET");
        await this.getClient("root", clientId).catch(() => {
            return this.repo.save({
                clientId,
                secret: clientSecret,
                description: "Internal client",
                roles: [Role.Tenants],
            });
        });
    }

    async importForTenant(tenantId: string) {
        await this.configImportService.importConfigsForTenant<ClientEntity>(
            tenantId,
            {
                subfolder: "clients",
                fileExtension: ".json",
                validationClass: ClientEntity,
                resourceType: "client config",
                loadData: (filePath) => {
                    const payload = JSON.parse(readFileSync(filePath, "utf8"));
                    return plainToClass(ClientEntity, payload);
                },
                checkExists: async (tenantId, data) => {
                    return this.getClient(tenantId, (data as any).clientId)
                        .then(() => true)
                        .catch(() => false);
                },
                deleteExisting: async (tenantId, data) => {
                    await this.repo.delete({
                        clientId: (data as any).clientId,
                        tenant: { id: tenantId },
                    });
                },
                processItem: async (tenantId, data, file) => {
                    const secret =
                        (data as any).secret ?? randomBytes(32).toString("hex");
                    await this.addClient(tenantId, data as any, secret);
                },
            },
        );
    }

    getClients(tenantId: string) {
        return this.repo
            .find({ where: { tenant: { id: tenantId } } })
            .then((list) =>
                list.map((e) => ({
                    clientId: e.clientId,
                    description: e.description,
                    tenantId,
                    roles: e.roles,
                })),
            );
    }

    getClient(tenantId: string, clientId: string) {
        return this.repo
            .findOneByOrFail({ clientId, tenant: { id: tenantId } })
            .then((e) => ({
                clientId: e.clientId,
                description: e.description,
                tenantId,
                roles: e.roles,
            }));
    }

    getClientSecret(sub: string, id: string): Promise<string> {
        return this.repo
            .findOneByOrFail({ clientId: id, tenant: { id: sub } })
            .then((e) => e.secret!);
    }

    async addClient(
        tenantId: string,
        dto: CreateClientDto,
        secret = randomBytes(32).toString("hex"),
    ) {
        const entity = await this.repo.save({
            ...dto,
            secret,
            tenant: { id: tenantId },
        });
        return {
            clientId: entity.clientId,
            description: entity.description,
            tenantId,
            roles: entity.roles,
            clientSecret: secret,
        };
    }

    updateClient(
        tenantId: string,
        clientId: string,
        updateClientDto: UpdateClientDto,
    ) {
        return this.repo.update(
            { clientId, tenant: { id: tenantId } },
            updateClientDto,
        );
    }

    async removeClient(tenantId: string, clientId: string) {
        await this.repo.delete({ clientId, tenant: { id: tenantId } });
    }

    validateClientCredentials(clientId: string, clientSecret: string) {
        return this.repo.findOne({ where: { clientId, secret: clientSecret } });
    }
}
