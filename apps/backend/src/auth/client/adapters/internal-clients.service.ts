import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { plainToClass } from "class-transformer";
import { Repository } from "typeorm";
import { ConfigImportService } from "../../../shared/utils/config-import/config-import.service";
import { ConfigImportOrchestratorService } from "../../../shared/utils/config-import/config-import-orchestrator.service";
import { Role } from "../../roles/role.enum";
import { ClientsProvider } from "../client.provider";
import { CreateClientDto } from "../dto/create-client.dto";
import { UpdateClientDto } from "../dto/update-client.dto";
import { ClientEntity } from "../entities/client.entity";

const BCRYPT_ROUNDS = 10;

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
        await this.getClient("root", clientId).catch(async () => {
            // Hash the root client secret before storing
            const hashedSecret = await bcrypt.hash(clientSecret, BCRYPT_ROUNDS);
            return this.repo.save({
                clientId,
                secret: hashedSecret,
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
                    // Hash the secret before storing
                    const hashedSecret = await bcrypt.hash(
                        secret,
                        BCRYPT_ROUNDS,
                    );
                    await this.repo.save({
                        ...(data as any),
                        secret: hashedSecret,
                        tenant: { id: tenantId },
                    });
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
                    allowedPresentationConfigs: e.allowedPresentationConfigs,
                    allowedIssuanceConfigs: e.allowedIssuanceConfigs,
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
                allowedPresentationConfigs: e.allowedPresentationConfigs,
                allowedIssuanceConfigs: e.allowedIssuanceConfigs,
            }));
    }

    /**
     * Get a client by its clientId only (without tenant context).
     * Used for JWT validation to fetch client restrictions.
     */
    async getClientById(clientId: string): Promise<ClientEntity | null> {
        return this.repo.findOne({ where: { clientId } });
    }

    async addClient(
        tenantId: string,
        dto: CreateClientDto,
        secret = randomBytes(32).toString("hex"),
    ) {
        // Hash the secret before storing
        const hashedSecret = await bcrypt.hash(secret, BCRYPT_ROUNDS);
        const entity = await this.repo.save({
            ...dto,
            secret: hashedSecret,
            tenant: { id: tenantId },
        });
        return {
            clientId: entity.clientId,
            description: entity.description,
            tenantId,
            roles: entity.roles,
            // Return the plain secret only during creation (one-time view)
            clientSecret: secret,
        };
    }

    /**
     * Rotate (regenerate) a client's secret.
     * Returns the new plain secret for one-time display.
     * @param tenantId - The tenant ID (null for tenant managers who can rotate any client's secret)
     * @param clientId - The client ID to rotate the secret for
     */
    async rotateClientSecret(
        tenantId: string | null,
        clientId: string,
    ): Promise<string> {
        // Build query - if tenantId is null, allow cross-tenant access (for tenant managers)
        const whereClause: { clientId: string; tenant?: { id: string } } = {
            clientId,
        };
        if (tenantId) {
            whereClause.tenant = { id: tenantId };
        }

        await this.repo.findOneByOrFail(whereClause);
        const newSecret = randomBytes(32).toString("hex");
        const hashedSecret = await bcrypt.hash(newSecret, BCRYPT_ROUNDS);
        await this.repo.update({ clientId }, { secret: hashedSecret });
        return newSecret;
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

    async validateClientCredentials(clientId: string, clientSecret: string) {
        const client = await this.repo.findOne({ where: { clientId } });
        if (!client?.secret) {
            return null;
        }
        const isValid = await bcrypt.compare(clientSecret, client.secret);
        return isValid ? client : null;
    }
}
