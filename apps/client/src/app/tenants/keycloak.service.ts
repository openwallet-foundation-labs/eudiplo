import { Injectable } from '@angular/core';
import KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import { ApiService } from '../api.service';
import { JwtService } from '../services/jwt.service';

export interface KeycloakConfig {
  realm: string;
  'auth-server-url': string;
  'ssl-required': string;
  resource: string;
  credentials: {
    secret: string;
  };
  'confidential-port': number;
}

export interface ClientInfo {
  id?: string;
  clientId?: string;
  clientSecret?: string;
  description?: string;
  enabled?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class KeycloakService {
  private kcAdminClient?: KeycloakAdminClient;
  private readonly REQUIRED_ROLE = 'manage-clients'; // Role required to manage Keycloak clients
  private readonly CLIENT_MANAGEMENT_ROLE = 'client-admin'; // Specific role for client management

  constructor(
    private apiService: ApiService,
    private jwtService: JwtService
  ) {}

  /**
   * Initialize Keycloak admin client with current user credentials
   */
  private initializeAdminClient(): void {
    const oauthConfig = this.apiService.getOAuthConfiguration();
    if (!oauthConfig?.server) {
      throw new Error('OAuth configuration not available. Please log in first.');
    }

    // Extract realm from the OIDC URL
    const realm = this.extractRealmFromOidcUrl(oauthConfig.server);

    this.kcAdminClient = new KeycloakAdminClient({
      baseUrl: this.getKeycloakBaseUrl(oauthConfig.server),
      realmName: realm,
    });
  }

  /**
   * Extract realm name from OIDC URL
   */
  private extractRealmFromOidcUrl(oidcUrl: string): string {
    // OIDC URL format: https://auth.eudi-wallet.dev/realms/eudiplo
    const match = oidcUrl.match(/\/realms\/([^/]+)/);
    return match ? match[1] : 'eudiplo'; // fallback to default
  }

  /**
   * Get Keycloak base URL from OIDC URL
   */
  private getKeycloakBaseUrl(oidcUrl: string): string {
    // Convert https://auth.eudi-wallet.dev/realms/eudiplo to https://auth.eudi-wallet.dev
    return oidcUrl.split('/realms/')[0];
  }

  /**
   * Check if current user has permission to manage Keycloak clients
   */
  hasClientManagementPermission(): boolean {
    const token = this.apiService.accessToken;
    if (!token) {
      return false;
    }

    // Check for admin role in realm access or client-admin role
    return (
      this.jwtService.hasRealmRole(token, this.REQUIRED_ROLE) ||
      this.jwtService.hasRealmRole(token, this.CLIENT_MANAGEMENT_ROLE) ||
      this.jwtService.hasClientRole(token, 'realm-management', 'manage-clients')
    );
  }

  /**
   * Authenticate with Keycloak using current user's token
   */
  private async auth(): Promise<void> {
    if (!this.kcAdminClient) {
      this.initializeAdminClient();
    }

    if (!this.kcAdminClient) {
      throw new Error('Failed to initialize Keycloak admin client');
    }

    const token = this.apiService.accessToken;
    if (!token) {
      throw new Error('No authentication token available. Please log in first.');
    }

    if (!this.hasClientManagementPermission()) {
      throw new Error(
        'Insufficient permissions to manage Keycloak clients. Required role: admin or client-admin'
      );
    }

    // Use the current user's access token for admin operations
    this.kcAdminClient.setAccessToken(token);

    const oauthConfig = this.apiService.getOAuthConfiguration();
    const realm = this.extractRealmFromOidcUrl(oauthConfig?.server || '');
    this.kcAdminClient.setConfig({ realmName: realm });
  }

  /**
   * List all clients created by script
   * @returns Array of clients
   */
  async listClients(): Promise<ClientInfo[]> {
    await this.auth();
    if (!this.kcAdminClient) {
      throw new Error('Keycloak admin client not initialized');
    }
    const clients = await this.kcAdminClient.clients.find();
    return clients
      .filter((c) => c.attributes?.['createdByScript'] === 'true')
      .map((c) => ({
        id: c.id,
        clientId: c.clientId,
        clientSecret: c.secret,
        description: c.description,
        enabled: c.enabled,
      }));
  }

  /**
   * Get a client by its client id
   * @param clientId
   * @returns
   */
  async getByClientId(clientId: string): Promise<ClientInfo | undefined> {
    await this.auth();
    const clients = await this.listClients();
    return clients.find((c) => c.clientId === clientId);
  }

  /**
   * Get a client by its id
   * @param id
   * @returns
   */
  async getClient(id: string): Promise<unknown> {
    await this.auth();
    if (!this.kcAdminClient) {
      throw new Error('Keycloak admin client not initialized');
    }
    return this.kcAdminClient.clients.findOne({ id });
  }

  /**
   * Create a new client
   * @param clientId
   * @param description
   * @returns
   */
  async createClient(clientId: string, description?: string): Promise<{ id: string }> {
    await this.auth();
    if (!this.kcAdminClient) {
      throw new Error('Keycloak admin client not initialized');
    }
    try {
      return await this.kcAdminClient.clients.create({
        clientId,
        description,
        serviceAccountsEnabled: true,
        enabled: true,
        attributes: {
          ['createdByScript']: 'true',
        },
        webOrigins: ['*'],
      });
    } catch (err: unknown) {
      const errorMessage = (err as Error)?.message || 'Unknown error';
      console.error('Error creating client:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Update client enabled status
   * @param id - Client ID
   * @param enabled - Whether to enable or disable
   * @returns
   */
  async updateClientStatus(id: string, enabled: boolean): Promise<void> {
    await this.auth();
    if (!this.kcAdminClient) {
      throw new Error('Keycloak admin client not initialized');
    }
    await this.kcAdminClient.clients.update({ id }, { enabled });
  }

  /**
   * Delete a client
   * @param clientId - Client ID
   * @returns
   */
  async deleteClient(clientId: string): Promise<void> {
    await this.auth();
    if (!this.kcAdminClient) {
      throw new Error('Keycloak admin client not initialized');
    }
    const client = await this.getByClientId(clientId);
    if (!client || !client.id) {
      throw new Error(`Client with ID ${clientId} not found`);
    }
    await this.kcAdminClient.clients.del({ id: client.id });
  }

  /**
   * Create configuration URL for a client
   * @param id
   * @param apiUrl
   * @param clientUrl
   * @returns
   */
  async createConfigUrl(id: string, apiUrl: string): Promise<string> {
    await this.auth();
    const client = (await this.getClient(id)) as { clientId?: string; secret?: string };
    if (!client) {
      throw new Error(`Client with ID ${id} not found`);
    }
    const currentUrl = `${window.location.protocol}//${window.location.host}/login`;
    const url = new URL(currentUrl);
    if (client.clientId) {
      url.searchParams.append('clientId', client.clientId);
    }
    if (client.secret) {
      url.searchParams.append('clientSecret', client.secret);
    }
    url.searchParams.append('apiUrl', apiUrl);

    const oauthConfig = this.apiService.getOAuthConfiguration();
    url.searchParams.append('oidcUrl', `${oauthConfig?.server || ''}`);
    return url.toString();
  }
}
