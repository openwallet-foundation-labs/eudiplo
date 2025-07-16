import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Client interface for service integration
export interface Client {
    id: string;
    secret: string;
}

@Injectable()
export class ClientService {
    private clients: Client[] | null = null;

    constructor(private configService: ConfigService) {}

    /**
     * Get clients from configuration
     * @returns
     */
    private getClients(): Client[] {
        if (!this.clients) {
            this.clients = this.loadClients();
        }
        return this.clients;
    }

    /**
     * Load clients from configuration
     */
    private loadClients(): Client[] {
        // Default clients for development/testing
        return [
            {
                id: this.configService.getOrThrow<string>('AUTH_CLIENT_ID'),
                secret: this.configService.getOrThrow<string>(
                    'AUTH_CLIENT_SECRET',
                ),
            },
        ];
    }

    /**
     * Validate client credentials (OAuth2 Client Credentials flow)
     * This is the primary authentication method for service integration
     */
    validateClient(clientId: string, clientSecret: string): Client | null {
        const client = this.getClients().find((c) => c.id === clientId);

        if (!client || client.secret !== clientSecret) {
            return null;
        }

        return client;
    }

    /**
     * Find client by ID
     */
    findClientById(clientId: string): Client | null {
        return this.getClients().find((c) => c.id === clientId) || null;
    }
}
