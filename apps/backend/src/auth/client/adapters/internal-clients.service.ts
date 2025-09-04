import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { Repository } from "typeorm";
import { ClientsProvider } from "../client.provider";
import { ClientEntity } from "../entities/client.entity";
import { CreateClientDto } from "../dto/create-client.dto";
import { ConfigService } from "@nestjs/config";
import { Role } from "../../roles/role.enum";

@Injectable()
export class InternalClientsProvider implements ClientsProvider, OnApplicationBootstrap {
  constructor(private configService: ConfigService, @InjectRepository(ClientEntity) private repo: Repository<ClientEntity>) {}

    async onApplicationBootstrap() {
        const clientId = this.configService.getOrThrow('AUTH_CLIENT_ID');
        const clientSecret = this.configService.getOrThrow('AUTH_CLIENT_SECRET');
        if(!await this.getClient('root', clientId)) {
            await this.repo.save({ clientId, secret: clientSecret, description: 'Internal client', roles: [Role.Tenants] });
        }
    }

  getClients(tenantId: string) {
    return this.repo.find({ where: { tenant: { id: tenantId } } })
      .then(list => list.map(e => ({ clientId: e.clientId, description: e.description, tenantId, roles: e.roles })));
  }

  getClient(tenantId: string, clientId: string) {
    return this.repo.findOne({ where: { clientId, tenant: { id: tenantId } } })
      .then(e => e ? { clientId: e.clientId, description: e.description, tenantId, roles: e.roles } : null);
  }

  getClientSecret(sub: string, id: string): Promise<string> {
        return this.repo.findOne({ where: { clientId: id, tenant: { id: sub } } })
          .then(e => e!.secret);
    }

  async addClient(tenantId: string, dto: CreateClientDto) {
    const secret = randomBytes(32).toString('hex');
    dto.clientId = `${tenantId}-${dto.clientId}`;
    const entity = await this.repo.save({ ...dto, secret, tenant: { id: tenantId } });    
    return { clientId: entity.clientId, description: entity.description, tenantId, roles: entity.roles, clientSecret: secret };
  }

  async removeClient(tenantId: string, clientId: string) {
    await this.repo.delete({ clientId, tenant: { id: tenantId } });
  }

  validateClientCredentials(clientId: string, clientSecret: string) {
    return this.repo.findOne({ where: { clientId, secret: clientSecret } })
      .then(e => e ? { clientId: e.clientId, description: e.description, tenantId: e.tenant?.id, roles: e.roles } : null);
  }
}
