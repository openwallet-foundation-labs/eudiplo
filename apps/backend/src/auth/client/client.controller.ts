import { Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Secured } from '../secure.decorator';
import { Role } from '../roles/role.enum';
import { Token, TokenPayload } from '../token.decorator';
import { CreateClientDto } from './dto/create-client.dto';
import { CLIENTS_PROVIDER, ClientsProvider } from './client.provider';
import { ClientSecretResponseDto } from './dto/client-secret-response.dto';

/**
 * Controller to manage clients.
 */
@ApiTags('client')
@Secured([Role.Clients, Role.Tenants])
@Controller('client')
export class ClientController {
    
    constructor(@Inject(CLIENTS_PROVIDER) private clients: ClientsProvider) {}

    /**
     * Get all clients for a user
     * @param user 
     * @returns 
     */
    @Get()
    getClients(@Token() user: TokenPayload) {
        return this.clients.getClients(user.entity!.id);
    }

    /**
     * Get a client by its id
     * @param id 
     * @param user 
     * @returns 
     */
    @Get(':id')
    getClient(@Param('id') id: string, @Token() user: TokenPayload) {
        return this.clients.getClient(user.entity!.id, id);
    }

    @Get(':id/secret')
    getClientSecret(@Param('id') id: string, @Token() user: TokenPayload): Promise<ClientSecretResponseDto> {
        return this.clients.getClientSecret(user.entity!.id, id).then(secret => ({ secret }));
    }

    /**
     * Create a new client
     * @param createClientDto 
     * @param user 
     * @returns 
     */
    @Post()
    createClient(@Body() createClientDto: CreateClientDto, @Token() user: TokenPayload) {
        return this.clients.addClient(user.entity!.id, createClientDto);
    }

    /**
     * Get a client by its id
     * @param id 
     * @param user 
     * @returns 
     */
    @Delete(':id')
    deleteClient(@Param('id') id: string, @Token() user: TokenPayload) {
        return this.clients.removeClient(user.entity!.id, id);
    }
}
