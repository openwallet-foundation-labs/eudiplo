import { Injectable } from '@angular/core';
import { OAuth2Client } from '@badgateway/oauth2-client';
import { ClientOptions, Config } from './generated/client';
import { client } from './generated/client.gen';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { clientControllerGetClientSecret, ClientEntity } from './generated';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  accessToken!: string;
  oauth2Client!: OAuth2Client;
  isAuthenticated = false;
  private tokenExpirationTime?: number;
  private baseUrl?: string;
  client!: Config<ClientOptions>;

  constructor(private httpClient: HttpClient) {
    this.loadTokenFromStorage();
    this.setClient(this.baseUrl || 'http://localhost:3000'); // Default base URL
  }

  async login(clientId: string, clientSecret: string, baseUrl: string) {
    //get oidc url
    const oidcUrl = await firstValueFrom(
      this.httpClient.get(`${baseUrl}/.well-known/oauth-authorization-server`)
    ).then((res: any) => res.issuer as string);

    this.oauth2Client = new OAuth2Client({
      discoveryEndpoint: `${oidcUrl}/.well-known/oauth-authorization-server`,
      clientId,
      clientSecret,
    });

    const safeConfig = {
      server: oidcUrl,
      clientId,
      clientSecret,
      baseUrl: baseUrl,
    };
    localStorage.setItem('oauth_config', JSON.stringify(safeConfig));

    // Always persist the clientSecret for auto-refresh across reloads
    try {
      localStorage.setItem('oauth_client_secret', clientSecret);
    } catch (e) {
      console.warn('Failed to persist client secret:', e);
    }

    // Set up the client immediately
    this.setClient(baseUrl);
  }

  setClient(url: string) {
    this.baseUrl = url;
    this.client = client.setConfig({
      baseUrl: url,
      auth: () => this.accessToken,
    });
  }

  /**
   * Refreshes the access token for the registrar using client credentials.
   * This method is called periodically to ensure the access token is valid.
   * NOTE: This will fail if client secret is not available (after page reload)
   */
  async refreshAccessToken(): Promise<void> {
    try {
      // Check if we have a valid OAuth2 client with credentials
      if (!this.oauth2Client || !this.oauth2Client.settings.clientSecret) {
        // Try to recover client secret from storage if user opted in
        const storedSecret = localStorage.getItem('oauth_client_secret');
        const oauthConfig = this.getOAuthConfiguration();
        if (storedSecret && oauthConfig?.server && oauthConfig?.clientId) {
          this.oauth2Client = new OAuth2Client({
            discoveryEndpoint: `${oauthConfig.server}/.well-known/oauth-authorization-server`,
            clientId: oauthConfig.clientId,
            clientSecret: storedSecret,
          });
        } else {
          throw new Error('OAuth2 client not properly configured. Please log in again.');
        }
      }

      console.log('Refreshing access token...');
      const token = await this.oauth2Client.clientCredentials();
      this.accessToken = token.accessToken;
      this.isAuthenticated = true;

      const expirationTime = token.expiresAt as number;
      this.tokenExpirationTime = expirationTime;

      // Save token to storage (without client secret)
      const storedOAuthConfig = localStorage.getItem('oauth_config');
      if (storedOAuthConfig) {
        this.saveTokenToStorage(token.accessToken, expirationTime, JSON.parse(storedOAuthConfig));
      }

      console.log('Access token refreshed successfully. Next refresh scheduled.');

      // Schedule next refresh only if we have valid credentials
      this.scheduleTokenRefresh(expirationTime);

      return Promise.resolve();
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      this.isAuthenticated = false;
      this.clearTokenFromStorage();
      return Promise.reject(error);
    }
  }

  /**
   * Checks if the user is currently authenticated
   */
  getAuthenticationStatus(): boolean {
    return this.isAuthenticated && !!this.accessToken && this.isTokenValid();
  }

  /**
   * Checks if the user is authenticated or can auto-refresh the token
   */
  async ensureAuthenticated(): Promise<boolean> {
    // If we're already authenticated with a valid token, return true
    if (this.getAuthenticationStatus()) {
      return true;
    }

    // If token is expired but we have credentials, try to refresh
    if (this.canRefreshToken()) {
      try {
        await this.refreshAccessToken();
        return this.getAuthenticationStatus();
      } catch (error) {
        console.warn('Failed to refresh token:', error);
        return false;
      }
    }

    return false;
  }

  /**
   * Manually trigger a token refresh (useful for components)
   */
  async manualRefreshToken(): Promise<void> {
    if (!this.canRefreshToken()) {
      throw new Error('Cannot refresh token: client credentials not available');
    }
    return this.refreshAccessToken();
  }

  /**
   * Checks if the current token is still valid
   */
  private isTokenValid(): boolean {
    if (!this.tokenExpirationTime) {
      return false;
    }
    const currentTime = Date.now();
    return this.tokenExpirationTime > currentTime + 60000; // 1 minute buffer
  }

  /**
   * Gets the time remaining until token expires (in milliseconds)
   */
  getTokenTimeRemaining(): number {
    if (!this.tokenExpirationTime) {
      return 0;
    }
    return Math.max(0, this.tokenExpirationTime - Date.now());
  }

  /**
   * Gets the current base URL
   */
  getBaseUrl(): string | undefined {
    return this.baseUrl;
  }

  /**
   * Checks if automatic token refresh is available
   * Returns false if client secret is not stored (after page reload)
   */
  canRefreshToken(): boolean {
    return !!(this.oauth2Client && this.oauth2Client.settings.clientSecret);
  }

  /**
   * Gets the current OAuth client ID
   */
  getClientId(): string | undefined {
    return this.oauth2Client?.settings.clientId;
  }

  getClientSecret(): string | undefined {
    return this.oauth2Client?.settings.clientSecret;
  }

  /**
   * Gets the current OAuth discovery URL
   */
  getoidcUrl(): string | undefined {
    return this.getOAuthConfiguration()?.server;
  }

  /**
   * Gets the current OAuth configuration for display purposes
   */
  getOAuthConfiguration(): { server?: string; clientId?: string; baseUrl?: string } | null {
    const storedConfig = localStorage.getItem('oauth_config');
    if (storedConfig) {
      try {
        return JSON.parse(storedConfig);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Logs out the user by clearing the access token
   */
  logout(): void {
    this.accessToken = '';
    this.isAuthenticated = false;
    this.tokenExpirationTime = undefined;
    this.baseUrl = undefined;
    this.clearTokenFromStorage();
    localStorage.removeItem('oauth_client_secret');
  }

  /**
   * Loads token from localStorage and validates it
   */
  private loadTokenFromStorage(): void {
    try {
      const storedToken = localStorage.getItem('access_token');
      const storedExpiration = localStorage.getItem('token_expiration');
      const storedOAuthConfig = localStorage.getItem('oauth_config');
      const storedSecret = localStorage.getItem('oauth_client_secret');

      if (storedToken && storedExpiration && storedOAuthConfig) {
        const expirationTime = parseInt(storedExpiration, 10);
        const currentTime = Date.now();

        // Check if token is still valid (with 1 minute buffer)
        if (expirationTime > currentTime + 60000) {
          this.accessToken = storedToken;
          this.tokenExpirationTime = expirationTime;
          this.isAuthenticated = true;

          // Restore OAuth client configuration
          const oauthConfig = JSON.parse(storedOAuthConfig);

          if (oauthConfig.server && oauthConfig.clientId) {
            this.oauth2Client = new OAuth2Client({
              discoveryEndpoint: `${oauthConfig.server}/.well-known/oauth-authorization-server`,
              clientId: oauthConfig.clientId,
              clientSecret: storedSecret || '',
            });
          }

          // Set up the client with the stored base URL
          if (oauthConfig.baseUrl) {
            this.setClient(oauthConfig.baseUrl);
          }

          // Schedule token refresh
          this.scheduleTokenRefresh(expirationTime);
        } else {
          // Token expired - try to refresh automatically if we have credentials
          if (storedSecret && storedOAuthConfig) {
            const oauthConfig = JSON.parse(storedOAuthConfig);
            if (oauthConfig.server && oauthConfig.clientId) {
              console.log('Token expired on app refresh, attempting automatic renewal...');

              // Restore OAuth client configuration for refresh
              this.oauth2Client = new OAuth2Client({
                discoveryEndpoint: `${oauthConfig.server}/.well-known/oauth-authorization-server`,
                clientId: oauthConfig.clientId,
                clientSecret: storedSecret,
              });

              // Set up the client with the stored base URL
              if (oauthConfig.baseUrl) {
                this.setClient(oauthConfig.baseUrl);
              }

              // Attempt to refresh the token automatically
              this.refreshAccessToken().catch((error) => {
                console.warn('Failed to auto-refresh expired token:', error);
                this.clearTokenFromStorage();
                localStorage.removeItem('oauth_client_secret');
              });

              return; // Don't clear storage yet, let refresh attempt complete
            }
          }

          // No credentials available for auto-refresh, clear everything
          console.log('Token expired and no credentials available for auto-refresh');
          this.clearTokenFromStorage();
          localStorage.removeItem('oauth_client_secret');
        }
      }
    } catch (error) {
      console.warn('Failed to load token from storage:', error);
      this.clearTokenFromStorage();
    }
  }

  /**
   * Saves token to localStorage
   */
  private saveTokenToStorage(token: string, expirationTime: number, oauthConfig: unknown): void {
    try {
      localStorage.setItem('access_token', token);
      localStorage.setItem('token_expiration', expirationTime.toString());
      localStorage.setItem('oauth_config', JSON.stringify(oauthConfig));
    } catch (error) {
      console.warn('Failed to save token to storage:', error);
    }
  }

  /**
   * Clears token from localStorage
   */
  private clearTokenFromStorage(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_expiration');
    localStorage.removeItem('oauth_config');
  }

  /**
   * Schedules token refresh before expiration
   * NOTE: Will not schedule if client secret is not available
   */
  private scheduleTokenRefresh(expirationTime: number): void {
    // Don't schedule refresh if we don't have client credentials
    if (!this.oauth2Client || !this.oauth2Client.settings.clientSecret) {
      console.warn('Cannot schedule token refresh: client secret not available');
      return;
    }

    const currentTime = Date.now();
    // Refresh when 75% of token lifetime has passed, or 5 minutes before expiration (whichever is earlier)
    const tokenLifetime = expirationTime - currentTime;
    const refreshAt75Percent = currentTime + tokenLifetime * 0.75;
    const refresh5MinsBefore = expirationTime - 300000; // 5 minutes before

    const refreshTime = Math.min(refreshAt75Percent, refresh5MinsBefore);
    const timeUntilRefresh = refreshTime - currentTime;

    if (timeUntilRefresh > 0) {
      console.log(`Token refresh scheduled in ${Math.floor(timeUntilRefresh / 60000)} minutes`);
      setTimeout(() => this.refreshAccessToken(), timeUntilRefresh);
    } else {
      // Token is very close to expiration, refresh immediately
      console.log('Token close to expiration, refreshing immediately');

      setTimeout(() => this.refreshAccessToken(), 1000);
    }
  }

  async createConfigUrl(client: ClientEntity, apiUrl: string) {
    const currentUrl = `${window.location.protocol}//${window.location.host}/login`;
    const url = new URL(currentUrl);

    if (!client.secret) {
      client.secret = await clientControllerGetClientSecret<true>({
        path: { id: client.clientId },
      }).then((res) => res.data.secret);
    }

    if (client.clientId) {
      url.searchParams.append('clientId', client.clientId);
    }
    if (client.secret) {
      url.searchParams.append('clientSecret', client.secret);
    }
    url.searchParams.append('apiUrl', apiUrl);
    return url.toString();
  }
}
