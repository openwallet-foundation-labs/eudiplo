import {
    BadRequestException,
    Injectable,
    OnApplicationBootstrap,
} from '@nestjs/common';
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
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';

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
        private cryptoService: CryptoService,
        private encryptionService: EncryptionService,
        private statutsListService: StatusListService,
        private registrarService: RegistrarService,
        @InjectRepository(ClientEntry)
        private clientRepository: Repository<ClientEntry>,
        @InjectMetric('tenant_client_total')
        private tenantClientTotal: Gauge<string>,
    ) {}

    async onApplicationBootstrap() {
        // Initialize the client metrics
        const count = await this.clientRepository.countBy({ status: 'set up' });
        this.tenantClientTotal.set({}, count);
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
     * Check if the client is set up, if not, set it up.
     * @param id
     * @returns
     */
    async isSetUp(id: string) {
        void this.clientRepository
            .countBy({ status: 'set up' })
            .then((count) => {
                this.tenantClientTotal.set({}, count);
            });

        await this.clientRepository.findOneByOrFail({ id }).then(
            (res) => {
                if (res.status === 'set up') {
                    return true;
                }
                throw new BadRequestException(
                    `Client ${id} is not set up. Please retry later.`,
                );
            },
            async () => {
                // create it to signl that the client getting set up
                await this.clientRepository.save({ id });
                await this.setUpClient(id).catch(async (err) => {
                    // if there is an error, update the client status
                    await this.clientRepository.update(
                        { id },
                        { status: 'error', error: err.message },
                    );
                    throw new BadRequestException(
                        `Error setting up client ${id}. Please retry later.`,
                    );
                });
                // if everything is fine, update the client status
                return this.clientRepository.update(
                    { id },
                    { status: 'set up' },
                );
            },
        );
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
