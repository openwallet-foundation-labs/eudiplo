import KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import { Credentials } from "@keycloak/keycloak-admin-client/lib/utils/auth";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClientsProvider, ClientView } from "../client.provider";
import { CreateClientDto } from "../dto/create-client.dto";
import { ClientEntity } from "../entities/client.entity";
import { decodeJwt } from "jose";
import { Role } from "../../roles/role.enum";

@Injectable()
export class KeycloakClientsProvider implements ClientsProvider, OnModuleInit {
  private kc: KeycloakAdminClient;

  constructor(
    private cfg: ConfigService,
    @InjectRepository(ClientEntity) private clientRepo: Repository<ClientEntity>
  ) {}    

  async onModuleInit() {
    const oidc = this.cfg.getOrThrow<string>('OIDC'); // e.g. https://kc/auth/realms/myrealm
    const [baseUrl, realmName] = oidc.split('/realms/');
    this.kc = new KeycloakAdminClient({ baseUrl, realmName });

    const creds: Credentials = {
      grantType: 'client_credentials',
      clientId: this.cfg.getOrThrow('OIDC_CLIENT_ID'),
      clientSecret: this.cfg.getOrThrow('OIDC_CLIENT_SECRET'),
    };

    await this.kc.auth(creds);
    const accessToken = await this.kc.getAccessToken();    
    const payload = decodeJwt(accessToken!);        
    const refreshMs = Math.max(5, (payload.exp! - Date.now() / 1000) - 10) * 1000;
    // Refresh a bit before expiry
    setInterval(async () => {
      try {
        await this.kc.auth(creds);
      } catch (e) {
        // log & keep trying on next tick.
      }
    }, refreshMs);
    await this.init();
  }

  /**
   * Checks if all the roles are available in the realm. If not they will be created.
   */
  private init() {
    const existingRoles: Role[] = [Role.Tenants, Role.Tenants, Role.IssuanceOffer, Role.Issuances, Role.PresentationOffer, Role.Presentations];
    this.kc.roles.find().then(roles => {
      // Check if all roles exist
      const missingRoles = existingRoles.filter(role => !roles.find(r => r.name === role));
      if (missingRoles.length) {
        // Create missing roles
        return Promise.all(missingRoles.map(role => this.kc.roles.create({ name: role })));
      }
    }).catch(err => {
        console.error('Error initializing Keycloak roles:', err);
    });
  }


  async getClients(tenantId: string): Promise<ClientView[]> {    
    // Option 1 (fast): read from your mirror table
    const rows = await this.clientRepo.find({ where: { tenant: { id: tenantId } } });
    return rows.map(e => ({ clientId: e.clientId, description: e.description, tenantId, roles: e.roles }));
  }

  async getClient(tenantId: string, clientId: string) {
    const e = await this.clientRepo.findOne({ where: { clientId, tenant: { id: tenantId } } });
    return e ? { clientId: e.clientId, description: e.description, tenantId, roles: e.roles } : null;
  }

  getClientSecret(sub: string, id: string): Promise<string> {    
    return this.kc.clients.find({ clientId: id }).then(clients => clients[0].secret!);        
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
      webOrigins: ['*'],
      attributes: { tenant_id: tenantId }, // useful marker
      protocolMappers: [
        // hardcode tenant_id claim into tokens
        {
          name: 'tenant_id',
          protocol: 'openid-connect',
          protocolMapper: 'oidc-hardcoded-claim-mapper',
          config: { 'claim.value': tenantId, 'claim.name': 'tenant_id', 'jsonType.label': 'String', 'id.token.claim': 'true', 'access.token.claim': 'true' }
        },
        // expose realm roles as "roles" claim
        {
          name: 'realm-roles',
          protocol: 'openid-connect',
          protocolMapper: 'oidc-usermodel-realm-role-mapper',
          config: { 'claim.name': 'roles', 'jsonType.label': 'String', 'multivalued': 'true', 'access.token.claim': 'true' }
        }
      ]
    });    
    
    const id = created.id!;

    // 3) Generate secret once (show only on creation)
    const secret = await this.kc.clients.generateNewClientSecret({ id });

    // 4) Assign realm roles to the service account user
    const svcUser = await this.kc.clients.getServiceAccountUser({ id });
    const allRealmRoles = await this.kc.roles.find();
    const toAssign = dto.roles
      .map(r => allRealmRoles.find(ar => ar.name === r))
      .filter(Boolean) as { id?: string; name?: string }[];

    if (toAssign.length) {
      await this.kc.users.addRealmRoleMappings({
        id: svcUser.id!,
        roles: toAssign.map(r => ({ id: r.id!, name: r.name! }))
      });
    }

    // 5) (Optional) Put a mirror row in your DB (no secret)
    const entity = this.clientRepo.create({ clientId: dto.clientId, description: dto.description, roles: dto.roles, tenant: { id: tenantId } });
    await this.clientRepo.save(entity);

    return { clientId: dto.clientId, description: dto.description, tenantId, roles: dto.roles, clientSecret: secret.value };
  }

  async removeClient(tenantId: string, clientId: string) {
    const kcClient = (await this.kc.clients.find({ clientId }))[0];
    if (kcClient?.id) await this.kc.clients.del({ id: kcClient.id });
    await this.clientRepo.delete({ clientId, tenant: { id: tenantId } });
  }
}
