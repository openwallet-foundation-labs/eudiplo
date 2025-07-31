import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CryptoService } from '../crypto/crypto.service';
import { EncryptionService } from '../crypto/encryption/encryption.service';
import { StatusListService } from '../issuer/status-list/status-list.service';
import { RegistrarService } from '../registrar/registrar.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientEntry } from './entitites/client.entity';
import { Repository } from 'typeorm/repository/Repository';

// Client interface for service integration
export interface Client {
    id: string;
    secret: string;
}

@Injectable()
export class ClientService {
    private clients: Client[] | null = null;

    constructor(
        private configService: ConfigService,
        private cryptoService: CryptoService,
        private encryptionService: EncryptionService,
        private statutsListService: StatusListService,
        private registrarService: RegistrarService,
        @InjectRepository(ClientEntry)
        private clientRepository: Repository<ClientEntry>,
    ) {}

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
     * Check if the client is set up, if not, set it up.
     * @param id
     * @returns
     */
    async isSetUp(id: string) {
        await this.clientRepository.findOneByOrFail({ id }).catch(async () => {
            await this.setUpClient(id);
            console.log(`Client ${id} set up successfully.`);
            return this.clientRepository.save({ id });
        });
        return true;
    }

    /**
     * Sends an event to set up a client, allowing all other services to listen and react accordingly.
     * @param id
     */
    async setUpClient(id: string) {
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
        await this.cryptoService.onTenantInit(id);
        await this.encryptionService.onTenantInit(id);
        await this.statutsListService.onTenantInit(id);
        await this.registrarService.onTenantInit(id);
    }
}
