import { Injectable } from '@angular/core';
import { OAuth2Client, OAuth2HttpError } from '@badgateway/oauth2-client';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { Subject } from 'rxjs';
import { client } from '@eudiplo/sdk-core';
import type { Client } from '@eudiplo/sdk-core/api/client/index';
import { environment } from '../../environments/environment';
import { OidcService } from './oidc.service';

/**
 * Base URL used before a session is restored. The runtime value from env.js
 * (API_BASE_URL of the container) wins over the build-time default.
 */
export function defaultApiUrl(runtimeApiUrl?: string, buildApiUrl?: string): string {
  return runtimeApiUrl || buildApiUrl || 'http://localhost:3000';
}

/** Statuses with which a token endpoint refuses client credentials (RFC 6749, section 5.2). */
const rejectedCredentialStatuses = new Set([400, 401]);
/** Delay before retrying a failed refresh; it doubles after each failure up to the maximum. */
const refreshRetryMinMs = 5_000;
const refreshRetryMaxMs = 60_000;

/** OAuth settings stored for a reload; the client secret is stored separately. */
interface StoredOAuthConfig {
  server?: string;
  clientId?: string;
  baseUrl?: string;
  tokenEndpoint?: string;
}

/**
 * True when the token endpoint answered 400 or 401, the statuses with which it
 * refuses client credentials, for example after the client was deleted or its
 * secret rotated. The response body is not checked. Any other failure, such as no
 * response, a 5xx or a proxy's 404 while the backend restarts, is retried.
 */
function isCredentialRejection(error: unknown): boolean {
  return error instanceof OAuth2HttpError && rejectedCredentialStatuses.has(error.httpCode);
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private _localAccessToken = '';
  private oauth2Client?: OAuth2Client;
  private _localIsAuthenticated = false;
  private tokenExpirationTime?: number;
  private baseUrl?: string;
  client!: Client;
  private refreshTimerId?: ReturnType<typeof setTimeout>;
  private refreshInProgress?: Promise<void> | null = null;
  /** The current credentials got a token, so a refresh that fails for another reason than rejection keeps the session. */
  private sessionStarted = false;
  private refreshRetries = 0;
  /** Changes when the credentials change or the session ends; a refresh started before is ignored. */
  private refreshGeneration = 0;
  private readonly renewed = new Subject<void>();
  /** Emits after each new token, for example when a kept session resumes after an outage. */
  readonly tokenRenewed$ = this.renewed.asObservable();
  /** The token endpoint rejected the credentials of this session. */
  private credentialsRejected = false;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly oidcService: OidcService
  ) {
    // Set default base URL from the runtime env.js or the build environment first
    const runtimeEnv = globalThis as { env?: { apiUrl?: string } };
    this.setClient(defaultApiUrl(runtimeEnv.env?.apiUrl, environment.api?.baseUrl));
    // Then try to load stored config (may override the default)
    this.loadTokenFromStorage();
  }

  /** True after the token endpoint rejected the credentials, for example of a deleted client. */
  areCredentialsRejected(): boolean {
    return this.credentialsRejected;
  }

  /** Returns the access token, preferring the OIDC token in OIDC mode. */
  get accessToken(): string {
    if (this.oidcService.mode === 'oidc') {
      return this.oidcService.token;
    }
    return this._localAccessToken;
  }

  /** Returns true if the user is authenticated (local or OIDC mode). */
  get isAuthenticated(): boolean {
    if (this.oidcService.mode === 'oidc') {
      return this.oidcService.authenticated;
    }
    return this._localIsAuthenticated;
  }

  set isAuthenticated(value: boolean) {
    this._localIsAuthenticated = value;
  }

  /** Fetches the OIDC discovery document from the given base URL. */
  async fetchDiscovery(baseUrl: string): Promise<any> {
    return firstValueFrom(this.httpClient.get(`${baseUrl}/.well-known/oauth-authorization-server`));
  }

  async login(clientId: string, clientSecret: string, baseUrl: string) {
    // Get OIDC issuer URL (safe network call with error handling)
    let discovery: any;
    try {
      discovery = await this.fetchDiscovery(baseUrl);
      if (!discovery?.issuer) {
        throw new Error('Invalid OIDC discovery response');
      }
    } catch (err) {
      console.error('Failed to fetch OIDC discovery document', err);
      throw err;
    }

    // Human login in OIDC mode: use Authorization Code + PKCE via keycloak-js.
    if (discovery.ui_client_id) {
      this.setClient(baseUrl);
      await this.oidcService.redirectToLogin({
        issuerUrl: discovery.issuer,
        uiClientId: discovery.ui_client_id,
        apiUrl: baseUrl,
      });
      return;
    }

    await this.loginWithClientCredentials(
      clientId,
      clientSecret,
      baseUrl,
      discovery.issuer,
      discovery.token_endpoint
    );
  }

  async loginWithClientCredentials(
    clientId: string,
    clientSecret: string,
    baseUrl: string,
    issuerUrl?: string,
    tokenEndpoint?: string
  ) {
    const discovery = tokenEndpoint ? undefined : await this.fetchDiscovery(baseUrl);
    const oidcUrl = issuerUrl ?? discovery?.issuer;
    const resolvedTokenEndpoint = tokenEndpoint ?? discovery?.token_endpoint;

    if (!oidcUrl || !resolvedTokenEndpoint) {
      throw new Error('OIDC discovery response is missing an issuer or token endpoint.');
    }

    // New credentials start a new session; a failure of their first token request ends it.
    this.resetRefresh();
    this.credentialsRejected = false;
    this.oauth2Client = new OAuth2Client({
      discoveryEndpoint: `${oidcUrl}/.well-known/oauth-authorization-server`,
      tokenEndpoint: resolvedTokenEndpoint,
      clientId,
      clientSecret,
    });

    const safeConfig = {
      server: oidcUrl,
      clientId,
      baseUrl: baseUrl,
      tokenEndpoint: resolvedTokenEndpoint,
    };
    // Persist oauth config (without secret) for rehydration
    try {
      localStorage.setItem('oauth_config', JSON.stringify(safeConfig));
    } catch (e) {
      console.warn('Failed to persist oauth config:', e);
    }

    // Persist client secret only if storage is available and caller opted in.
    try {
      localStorage.setItem('oauth_client_secret', clientSecret);
    } catch (e) {
      console.warn('Failed to persist client secret (storage may be unavailable):', e);
    }

    // Set up the client immediately
    this.setClient(baseUrl);
  }

  /**
   * Points the client at the backend of a restored OIDC session.
   * Called after OidcService.initialize(); no-op when no OIDC session was restored.
   */
  syncWithOidcSession(): void {
    if (this.oidcService.mode === 'oidc' && this.oidcService.apiUrl) {
      this.setClient(this.oidcService.apiUrl);
    }
  }

  setClient(url: string) {
    this.baseUrl = url;
    this.client = client;
    // Configure SDK client to ensure it requests a fresh token when needed.
    client.setConfig({
      baseUrl: url,
      auth: async () => {
        // Ensure token is valid or refreshed before providing it to the SDK
        try {
          await this.ensureAuthenticated();
        } catch (e) {
          // If ensureAuthenticated fails, return whatever token we have (may be empty)
          console.warn('Failed to ensure authentication for SDK auth callback', e);
        }
        return this.accessToken;
      },
    });
  }

  /**
   * Refreshes the access token for the registrar using client credentials.
   * This method is called periodically to ensure the access token is valid.
   *
   * When the token endpoint rejects the credentials, the session ends and the
   * stored settings are removed. Any other failure of a started session, such as
   * the backend being down, keeps the token (and `isAuthenticated`) until it
   * expires, keeps the stored settings for a reload, and retries with a backoff.
   */
  async refreshAccessToken(): Promise<void> {
    // Prevent concurrent refresh attempts
    if (this.refreshInProgress) {
      return this.refreshInProgress;
    }

    const refresh = this.requestToken().finally(() => {
      if (this.refreshInProgress === refresh) {
        this.refreshInProgress = null;
      }
    });
    this.refreshInProgress = refresh;
    return refresh;
  }

  /** One token request; its outcome is ignored when the credentials changed or the session ended meanwhile. */
  private async requestToken(): Promise<void> {
    const generation = this.refreshGeneration;
    try {
      const token = await this.clientForRefresh().clientCredentials();
      if (generation !== this.refreshGeneration) {
        return;
      }
      this._localAccessToken = token.accessToken;
      this.isAuthenticated = true;
      this.sessionStarted = true;
      this.refreshRetries = 0;

      const expirationTime = token.expiresAt as number;
      this.tokenExpirationTime = expirationTime;

      // Save token to storage (without client secret)
      const storedOAuthConfig = localStorage.getItem('oauth_config');
      if (storedOAuthConfig) {
        this.saveTokenToStorage(token.accessToken, expirationTime, JSON.parse(storedOAuthConfig));
      }

      // Schedule next refresh only if we have valid credentials
      this.scheduleTokenRefresh(expirationTime);
      this.renewed.next();
    } catch (error) {
      if (generation !== this.refreshGeneration) {
        throw error;
      }
      if (
        this.sessionStarted &&
        this.oauth2Client?.settings.clientSecret &&
        !isCredentialRejection(error)
      ) {
        const delay = this.scheduleRefreshRetry();
        console.warn(`Failed to refresh access token, retrying in ${delay / 1000} s:`, error);
      } else {
        console.error('Failed to refresh access token:', error);
        this.forgetCredentials();
        this.credentialsRejected = isCredentialRejection(error);
      }
      throw error;
    }
  }

  /** The client holding the secret, rebuilt from storage when only the stored settings are left. */
  private clientForRefresh(): OAuth2Client {
    if (this.oauth2Client?.settings.clientSecret) {
      return this.oauth2Client;
    }
    const storedSecret = localStorage.getItem('oauth_client_secret');
    const restored = storedSecret
      ? this.clientFromStoredConfig(this.getOAuthConfiguration(), storedSecret)
      : undefined;
    if (!restored) {
      throw new Error('OAuth2 client not properly configured. Please log in again.');
    }
    this.oauth2Client = restored;
    return restored;
  }

  /**
   * True while a started session cannot renew its token for another reason than
   * rejected credentials, for example because the backend is down, and retries.
   */
  isReconnecting(): boolean {
    return this.refreshRetries > 0;
  }

  /**
   * Checks if the user is currently authenticated
   */
  getAuthenticationStatus(): boolean {
    if (this.oidcService.mode === 'oidc') {
      return this.oidcService.authenticated && !!this.oidcService.token;
    }
    return this.isAuthenticated && !!this.accessToken && this.isTokenValid();
  }

  /**
   * Checks if the user is authenticated or can auto-refresh the token
   */
  async ensureAuthenticated(): Promise<boolean> {
    if (this.oidcService.mode === 'oidc') {
      try {
        await this.oidcService.updateToken(30);
      } catch (error) {
        console.warn('Failed to update OIDC token:', error);
      }
      return this.getAuthenticationStatus();
    }

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
    if (this.oidcService.mode === 'oidc') {
      await this.oidcService.updateToken(30);
      return;
    }

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
   * Returns false without a client secret, for example after the credentials were rejected
   */
  canRefreshToken(): boolean {
    if (this.oidcService.mode === 'oidc') {
      return true;
    }
    return !!this.oauth2Client?.settings.clientSecret;
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
  getOAuthConfiguration(): StoredOAuthConfig | null {
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
   * Builds the OAuth2 client for stored settings, or undefined when they are incomplete.
   * It gets the stored token endpoint, or the backend's default for settings stored
   * without one: without an endpoint it would run discovery, and the library keeps
   * a failed discovery for good, so no later refresh could succeed.
   */
  private clientFromStoredConfig(
    oauthConfig: StoredOAuthConfig | null,
    clientSecret: string
  ): OAuth2Client | undefined {
    if (!oauthConfig?.server || !oauthConfig.clientId) {
      return undefined;
    }
    return new OAuth2Client({
      discoveryEndpoint: `${oauthConfig.server}/.well-known/oauth-authorization-server`,
      tokenEndpoint:
        oauthConfig.tokenEndpoint ??
        (oauthConfig.baseUrl ? `${oauthConfig.baseUrl}/api/oauth2/token` : undefined),
      clientId: oauthConfig.clientId,
      clientSecret,
    });
  }

  /**
   * Logs out the user by clearing the access token
   */
  logout(): void {
    if (this.oidcService.mode === 'oidc') {
      this.resetRefresh();
      this.oidcService.logout();
      return;
    }

    this.forgetCredentials();
    this.credentialsRejected = false;
    this.oauth2Client = undefined;
    this._localAccessToken = '';
    this.tokenExpirationTime = undefined;
    this.baseUrl = undefined;
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
        const expirationTime = Number.parseInt(storedExpiration, 10);
        const currentTime = Date.now();

        // Check if token is still valid (with 1 minute buffer)
        if (expirationTime > currentTime + 60000) {
          this._localAccessToken = storedToken;
          this.tokenExpirationTime = expirationTime;
          this.isAuthenticated = true;
          this.sessionStarted = true;

          // Restore OAuth client configuration
          const oauthConfig = JSON.parse(storedOAuthConfig);
          this.oauth2Client = this.clientFromStoredConfig(oauthConfig, storedSecret || '');

          // Set up the client with the stored base URL
          if (oauthConfig.baseUrl) {
            this.setClient(oauthConfig.baseUrl);
          }

          // Schedule token refresh
          this.scheduleTokenRefresh(expirationTime);
        } else {
          // Token expired - try to refresh automatically if we have credentials
          if (storedSecret) {
            const oauthConfig = JSON.parse(storedOAuthConfig);
            const restored = this.clientFromStoredConfig(oauthConfig, storedSecret);
            if (restored) {
              console.log('Token expired on app refresh, attempting automatic renewal...');

              // Restore OAuth client configuration for refresh
              this.oauth2Client = restored;
              this.sessionStarted = true;

              // Set up the client with the stored base URL
              if (oauthConfig.baseUrl) {
                this.setClient(oauthConfig.baseUrl);
              }

              // Rejected credentials end the session; any other failure keeps it and retries.
              // refreshAccessToken logs the failure.
              this.refreshAccessToken().catch(() => undefined);

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
   * Ends the local session, on logout or after the token endpoint rejected the
   * credentials, and forgets the credentials so they are neither sent again nor
   * reused after a reload. The client ID stays on display and the access token
   * stays usable until it expires; logout clears both.
   */
  private forgetCredentials(): void {
    this.resetRefresh();
    this.isAuthenticated = false;
    if (this.oauth2Client) {
      this.oauth2Client = new OAuth2Client({
        ...this.oauth2Client.settings,
        clientSecret: undefined,
      });
    }
    this.clearTokenFromStorage();
    localStorage.removeItem('oauth_client_secret');
  }

  /** Stops refreshing for the current credentials, including a refresh still in flight. */
  private resetRefresh(): void {
    this.refreshGeneration++;
    this.refreshInProgress = null;
    this.clearRefreshTimer();
    this.sessionStarted = false;
    this.refreshRetries = 0;
  }

  /** Schedules the next attempt after a failed refresh, 5 s and then doubling up to a minute, and returns the delay. */
  private scheduleRefreshRetry(): number {
    const delay = Math.min(refreshRetryMaxMs, refreshRetryMinMs * 2 ** this.refreshRetries);
    this.refreshRetries++;
    this.setRefreshTimer(delay);
    return delay;
  }

  /** Runs a refresh after the delay, replacing any refresh scheduled before. */
  private setRefreshTimer(delayMs: number): void {
    this.clearRefreshTimer();
    this.refreshTimerId = setTimeout(() => {
      this.refreshTimerId = undefined;
      // refreshAccessToken logs the failure.
      this.refreshAccessToken().catch(() => undefined);
    }, delayMs);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = undefined;
    }
  }

  /**
   * Schedules token refresh before expiration
   * NOTE: Will not schedule if client secret is not available
   */
  private scheduleTokenRefresh(expirationTime: number): void {
    // Don't schedule refresh if we don't have client credentials
    if (!this.oauth2Client?.settings.clientSecret) {
      console.warn('Cannot schedule token refresh: client secret not available');
      return;
    }

    const currentTime = Date.now();
    // Use an adaptive refresh buffer to support both short and long token lifetimes.
    // - For long-lived tokens, refresh up to 5 minutes before expiry.
    // - For short-lived tokens (e.g., 5 minutes), refresh at ~75% of lifetime.
    // - Never refresh with less than a 30-second safety buffer.
    const tokenLifetime = Math.max(0, expirationTime - currentTime);
    const minimumSafetyBuffer = 30000; // 30 seconds
    const maxSafetyBuffer = 300000; // 5 minutes
    const quarterLifetimeBuffer = Math.floor(tokenLifetime * 0.25);
    const refreshBuffer = Math.min(
      maxSafetyBuffer,
      Math.max(minimumSafetyBuffer, quarterLifetimeBuffer)
    );

    const refreshTime = expirationTime - refreshBuffer;
    const timeUntilRefresh = refreshTime - currentTime;

    if (timeUntilRefresh > 0) {
      console.log(`Token refresh scheduled in ${Math.floor(timeUntilRefresh / 60000)} minutes`);
      this.setRefreshTimer(timeUntilRefresh);
    } else {
      // Token is very close to expiration, refresh immediately
      console.log('Token close to expiration, refreshing immediately');
      this.setRefreshTimer(1000);
    }
  }
}
