import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { Repository } from "typeorm";
import { getRoles, Role } from "../../roles/role.enum";
import { ClientsProvider } from "../client.provider";
import { CreateClientDto } from "../dto/create-client.dto";
import { UpdateClientDto } from "../dto/update-client.dto";
import { ClientEntity } from "../entities/client.entity";

@Injectable()
export class InternalClientsProvider
    implements ClientsProvider, OnApplicationBootstrap
{
    constructor(
        private configService: ConfigService,
        @InjectRepository(ClientEntity) private repo: Repository<ClientEntity>,
    ) {}

    async onApplicationBootstrap() {
        const clientId = this.configService.getOrThrow("AUTH_CLIENT_ID");
        const clientSecret =
            this.configService.getOrThrow("AUTH_CLIENT_SECRET");
        await this.getClient("root", clientId).catch(() => {
            //check if auth user should be added to a tenant
            const addToTenant =
                this.configService.get<string>("AUTH_CLIENT_TENANT");
            let roles: Role[] = [];
            //check if the list of roles is defined
            if (addToTenant) {
                const addRoles = this.configService.get("AUTH_CLIENT_ROLES");
                roles = getRoles(addRoles);
            } else {
                roles.push(Role.Tenants);
            }

            return this.repo
                .save({
                    clientId,
                    secret: clientSecret,
                    description: "Internal client",
                    roles,
                    tenant: addToTenant ? { id: addToTenant } : undefined,
                })
                .then(() => {
                    // eslint-disable-next-line no-console
                    console.log(
                        `Added internal auth client ${clientId} to database`,
                    );
                });
        });
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

    async addClient(tenantId: string, dto: CreateClientDto) {
        const secret = randomBytes(32).toString("hex");
        dto.clientId = `${tenantId}-${dto.clientId}`;
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
