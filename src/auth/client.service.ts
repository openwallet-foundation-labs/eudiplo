import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TENANT_EVENTS } from './tenant-events';

// Client interface for service integration
export interface Client {
    id: string;
    secret: string;
}

@Injectable()
export class ClientService implements OnApplicationBootstrap {
    private clients: Client[] | null = null;

    constructor(
        private configService: ConfigService,
        private eventEmitter: EventEmitter2,
    ) {}

    onApplicationBootstrap() {
        this.setUpClient('root');
    }

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

    /**
     * Sends an event to set up a client, allowing all other services to listen and react accordingly.
     * @param id
     */
    setUpClient(id: string) {
        const folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            id,
        );
        if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
        }

        const displayInfo = [
            {
                name: 'EUDI Wallet dev',
                locale: 'de-DE',
                logo: {
                    uri: '<PUBLIC_URL>/issuer.png',
                    url: '<PUBLIC_URL>/issuer.png',
                },
            },
        ];
        writeFileSync(
            join(folder, 'display.json'),
            JSON.stringify(displayInfo, null, 2),
        );

        this.eventEmitter.emit(TENANT_EVENTS.TENANT_INIT, id);
    }
}
