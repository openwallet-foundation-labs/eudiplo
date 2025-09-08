import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { ClientEntity } from "./entities/client.entity";

export const CLIENTS_PROVIDER = "CLIENTS_PROVIDER";

export interface ClientsProvider {
    updateClient(
        tenantId: string,
        clientId: string,
        updateClientDto: UpdateClientDto,
    ): unknown;
    getClientSecret(sub: string, id: string): Promise<string>;
    getClients(tenantId: string): Promise<ClientEntity[]>;
    getClient(tenantId: string, clientId: string): Promise<ClientEntity>;
    addClient(tenantId: string, dto: CreateClientDto): Promise<ClientEntity>;
    removeClient(tenantId: string, clientId: string): Promise<void>;

    // Only for internal backend (not used with KC; you’ll validate JWTs instead)
    validateClientCredentials?(
        clientId: string,
        clientSecret: string,
    ): Promise<ClientEntity | null>;
}
