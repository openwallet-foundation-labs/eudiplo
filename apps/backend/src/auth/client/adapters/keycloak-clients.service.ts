import KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import { Credentials } from "@keycloak/keycloak-admin-client/lib/utils/auth";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { decodeJwt } from "jose";
import { Repository } from "typeorm";
import { ConfigImportOrchestratorService } from "../../../shared/utils/config-import/config-import-orchestrator.service";
import { allRoles, Role } from "../../roles/role.enum";
import { ClientsProvider } from "../client.provider";
import { CreateClientDto } from "../dto/create-client.dto";
import { UpdateClientDto } from "../dto/update-client.dto";
import { ClientEntity } from "../entities/client.entity";

@Injectable()
export class KeycloakClientsProvider
    extends ClientsProvider
    implements OnModuleInit
{
    private kc!: KeycloakAdminClient;

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(ClientEntity)
        private readonly clientRepo: Repository<ClientEntity>,
        configImportOrchestrator: ConfigImportOrchestratorService,
    ) {
        super(configImportOrchestrator);
    }

    async onModuleInit() {
        const oidc = this.configService.getOrThrow<string>("OIDC");
        const [baseUrl, realmName] = oidc.split("/realms/");
        this.kc = new KeycloakAdminClient({ baseUrl, realmName });

        const creds: Credentials = {
            grantType: "client_credentials",
            clientId: this.configService.getOrThrow("OIDC_CLIENT_ID"),
            clientSecret: this.configService.getOrThrow("OIDC_CLIENT_SECRET"),
        };

        await this.kc.auth(creds);
        const accessToken = await this.kc.getAccessToken();
        const payload = decodeJwt(accessToken!);
        const refreshMs =
            Math.max(5, payload.exp! - Date.now() / 1000 - 10) * 1000;
        // Refresh a bit before expiry
        setInterval(async () => {
            try {
                await this.kc.auth(creds);
            } catch {
                // log & keep trying on next tick.
            }
        }, refreshMs);
        await this.init();
    }

    /**
     * Imports clients for a tenant. No-op for Keycloak as clients are managed directly in Keycloak.
     */
    importForTenant(_tenantId: string): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Checks if all the roles are available in the realm. If not they will be created.
     */
    private init() {
        const existingRoles: Role[] = allRoles;
        return this.kc.roles
            .find()
            .then((roles) => {
                // Check if all roles exist
                const missingRoles = existingRoles.filter(
                    (role) => !roles.some((r) => r.name === role),
                );
                if (missingRoles.length) {
                    // Create missing roles
                    return Promise.all(
                        missingRoles.map((role) =>
                            this.kc.roles.create({ name: role }),
                        ),
                    );
                }
            })
            .catch((err) => {
                console.error("Error initializing Keycloak roles:", err);
            });
    }

    async getClients(tenantId: string): Promise<ClientEntity[]> {
        return this.clientRepo.find({
            where: { tenant: { id: tenantId } },
        });
    }

    async getClient(tenantId: string, clientId: string) {
        return this.clientRepo.findOneByOrFail({
            clientId,
            tenant: { id: tenantId },
        });
    }

    /**
     * Get a client by its clientId only (without tenant context).
     * Used for JWT validation to fetch client restrictions.
     */
    async getClientById(clientId: string): Promise<ClientEntity | null> {
        return this.clientRepo.findOne({ where: { clientId } });
    }

    getClientSecret(_sub: string, id: string): Promise<string> {
        return this.kc.clients
            .find({ clientId: id })
            .then((clients) => clients[0].secret!);
    }

    async addClient(tenantId: string, dto: CreateClientDto) {
        dto.clientId = `${tenantId}-${dto.clientId}`; // namespaced
        // 1) Create client
        const created = await this.kc.clients.create({
            clientId: dto.clientId,
            description: dto.description,
            serviceAccountsEnabled: true,
            enabled: true,
            publicClient: false,
            directAccessGrantsEnabled: false,
            standardFlowEnabled: false,
            webOrigins: ["*"],
            attributes: { tenant_id: tenantId }, // useful marker
            protocolMappers: [
                // hardcode tenant_id claim into tokens
                {
                    name: "tenant_id",
                    protocol: "openid-connect",
                    protocolMapper: "oidc-hardcoded-claim-mapper",
                    config: {
                        "claim.value": tenantId,
                        "claim.name": "tenant_id",
                        "jsonType.label": "String",
                        "id.token.claim": "true",
                        "access.token.claim": "true",
                    },
                },
                // expose realm roles as "roles" claim
                {
                    name: "realm-roles",
                    protocol: "openid-connect",
                    protocolMapper: "oidc-usermodel-realm-role-mapper",
                    config: {
                        "claim.name": "roles",
                        "jsonType.label": "String",
                        multivalued: "true",
                        "access.token.claim": "true",
                    },
                },
            ],
        });

        const id = created.id!;

        // 3) Generate secret once (show only on creation)
        const secret = await this.kc.clients.generateNewClientSecret({ id });

        // 4) Assign realm roles to the service account user
        const svcUser = await this.kc.clients.getServiceAccountUser({ id });
        const allRealmRoles = await this.kc.roles.find();
        const toAssign = dto.roles
            .map((r) => allRealmRoles.find((ar) => ar.name === r))
            .filter(Boolean) as { id?: string; name?: string }[];

        if (toAssign.length) {
            await this.kc.users.addRealmRoleMappings({
                id: svcUser.id!,
                roles: toAssign.map((r) => ({ id: r.id!, name: r.name! })),
            });
        }

        // 5) (Optional) Put a mirror row in your DB (no secret)
        const entity = this.clientRepo.create({
            clientId: dto.clientId,
            description: dto.description,
            roles: dto.roles,
            allowedPresentationConfigs: dto.allowedPresentationConfigs,
            allowedIssuanceConfigs: dto.allowedIssuanceConfigs,
            tenant: { id: tenantId },
        });
        await this.clientRepo.save(entity);

        return {
            clientId: dto.clientId,
            description: dto.description,
            tenantId,
            roles: dto.roles,
            allowedPresentationConfigs: dto.allowedPresentationConfigs,
            allowedIssuanceConfigs: dto.allowedIssuanceConfigs,
            clientSecret: secret.value,
        };
    }

    async updateClient(
        tenantId: string,
        clientId: string,
        updateClientDto: UpdateClientDto,
    ) {
        const client = await this.getClient(tenantId, clientId);

        // Get service account user
        const kcClient = (await this.kc.clients.find({ clientId }))[0];
        const svcUser = await this.kc.clients.getServiceAccountUser({
            id: kcClient.id!,
        });

        // Get all realm roles
        const allRealmRoles = await this.kc.roles.find();

        // Roles to assign
        const newRoles = updateClientDto.roles || [];
        const toAssign = newRoles
            .map((r) => allRealmRoles.find((ar) => ar.name === r))
            .filter(Boolean) as { id?: string; name?: string }[];

        // Get currently assigned roles
        const currentRoles = await this.kc.users.listRealmRoleMappings({
            id: svcUser.id!,
        });

        // Roles to remove
        const toRemove = currentRoles
            .filter((cr) => !newRoles.includes(cr.name as Role))
            .map((r) => ({ id: r.id!, name: r.name! }));

        // Remove roles no longer assigned
        if (toRemove.length) {
            await this.kc.users.delRealmRoleMappings({
                id: svcUser.id!,
                roles: toRemove,
            });
        }

        // Add new roles
        if (toAssign.length) {
            await this.kc.users.addRealmRoleMappings({
                id: svcUser.id!,
                roles: toAssign.map((r) => ({ id: r.id!, name: r.name! })),
            });
        }

        // Update client in Keycloak
        await this.kc.clients.update(
            { id: kcClient.id! },
            {
                description: updateClientDto.description ?? client.description,
            },
        );

        // Optionally update your DB mirror
        await this.clientRepo.update(
            { clientId, tenant: { id: tenantId } },
            { ...updateClientDto },
        );

        return this.getClient(tenantId, clientId);
    }

    async removeClient(tenantId: string, clientId: string) {
        const kcClient = (await this.kc.clients.find({ clientId }))[0];
        if (kcClient?.id) await this.kc.clients.del({ id: kcClient.id });
        await this.clientRepo.delete({ clientId, tenant: { id: tenantId } });
    }
}
