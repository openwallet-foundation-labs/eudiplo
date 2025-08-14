import { Injectable } from '@angular/core';
import { OAuth2Client } from '@badgateway/oauth2-client';
import { ClientOptions, Config } from './generated/client';
import { client } from './generated/client.gen';

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

  constructor() {
    this.loadTokenFromStorage();
    this.setClient(this.baseUrl || 'http://localhost:3000'); // Default base URL
  }

  login(oidcUrl: string, clientId: string, clientSecret: string, baseUrl: string) {
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
  async refreshAccessToken() {
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

      // Schedule next refresh only if we have valid credentials
      this.scheduleTokenRefresh(expirationTime);
    } catch (error) {
      this.isAuthenticated = false;
      this.clearTokenFromStorage();
      throw error;
    }
  }

  /**
   * Checks if the user is currently authenticated
   */
  getAuthenticationStatus(): boolean {
    return this.isAuthenticated && !!this.accessToken && this.isTokenValid();
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

          // Restore OAuth client configuration (without client secret)
          const oauthConfig = JSON.parse(storedOAuthConfig);

          // NOTE: Client secret is not stored for security reasons
          // This means automatic token refresh won't work on page reload
          // User will need to log in again when token expires
          if (oauthConfig.server && oauthConfig.clientId) {
            // If secret persisted (remember me), restore fully; else partial
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
          // Token expired, clear storage
          this.clearTokenFromStorage();
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
}
