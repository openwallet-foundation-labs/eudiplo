import {
    ConfigImportOrchestratorService,
    ImportPhase,
} from "../../shared/utils/config-import/config-import-orchestrator.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { ClientEntity } from "./entities/client.entity";

export const CLIENTS_PROVIDER = "CLIENTS_PROVIDER";

export abstract class ClientsProvider {
    abstract updateClient(
        tenantId: string,
        clientId: string,
        updateClientDto: UpdateClientDto,
    ): unknown;
    abstract getClientSecret(sub: string, id: string): Promise<string>;
    abstract getClients(tenantId: string): Promise<ClientEntity[]>;
    abstract getClient(
        tenantId: string,
        clientId: string,
    ): Promise<ClientEntity>;

    /**
     * Get a client by its clientId only (without tenant context).
     * Used for JWT validation where we need to fetch the client's restrictions.
     * @param clientId The client ID (may be namespaced with tenant prefix for Keycloak)
     * @returns The client entity or null if not found
     */
    abstract getClientById(clientId: string): Promise<ClientEntity | null>;

    abstract addClient(
        tenantId: string,
        dto: CreateClientDto,
    ): Promise<ClientEntity>;
    abstract removeClient(tenantId: string, clientId: string): Promise<void>;
    abstract importForTenant(tenantId: string): Promise<void>;

    // Only for internal backend (not used with KC; you’ll validate JWTs instead)
    validateClientCredentials?(
        clientId: string,
        clientSecret: string,
    ): Promise<ClientEntity | null>;

    constructor(configImportOrchestrator: ConfigImportOrchestratorService) {
        configImportOrchestrator.register(
            "clients",
            ImportPhase.CORE,
            (tenantId) => this.importForTenant(tenantId),
        );
    }
}
