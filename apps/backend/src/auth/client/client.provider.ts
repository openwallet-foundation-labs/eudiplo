import { CreateClientDto } from "./dto/create-client.dto";

export const CLIENTS_PROVIDER = "CLIENTS_PROVIDER";

export interface ClientsProvider {
  getClientSecret(sub: string, id: string): Promise<string>;
  getClients(tenantId: string): Promise<ClientView[]>;
  getClient(tenantId: string, clientId: string): Promise<ClientView | null>;
  addClient(tenantId: string, dto: CreateClientDto): Promise<ClientView & { clientSecret?: string }>;
  removeClient(tenantId: string, clientId: string): Promise<void>;

  // Only for internal backend (not used with KC; you’ll validate JWTs instead)
  validateClientCredentials?(clientId: string, clientSecret: string): Promise<ClientView | null>;
}

export class ClientView {
  clientId: string;
  description?: string;
  tenantId?: string;
  roles: string[];
}
