import { Injectable } from '@angular/core';
import { environment as defaultEnvironment } from '../../environments/environment';

export interface OidcConfig {
  clientId: string;
  clientSecret: string;
}

export interface ApiConfig {
  baseUrl: string;
}

export interface AppEnvironment {
  production: boolean;
  oidc: OidcConfig;
  api: ApiConfig;
}

@Injectable({
  providedIn: 'root',
})
export class EnvironmentService {
  private readonly env: AppEnvironment;

  constructor() {
    // Merge default environment with runtime environment from window['env']
    const runtimeEnvironment = (window as any)['env'] || {};

    this.env = {
      ...defaultEnvironment,
      api: {
        ...defaultEnvironment.api,
        // Use runtime apiUrl if available
        baseUrl: runtimeEnvironment.apiUrl || defaultEnvironment.api.baseUrl,
      },
      oidc: {
        ...defaultEnvironment.oidc,
        // Use runtime clientId if available
        clientId: runtimeEnvironment.clientId || defaultEnvironment.oidc.clientId,
      },
    };
  }

  /**
   * Gets the complete environment configuration
   */
  getEnvironment(): AppEnvironment {
    return this.env;
  }

  /**
   * Checks if we're running in development mode
   */
  isDevelopment(): boolean {
    return !this.env.production;
  }
}
