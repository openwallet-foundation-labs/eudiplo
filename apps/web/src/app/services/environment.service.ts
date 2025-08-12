import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface OidcConfig {
  oidcUrl: string;
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
  private readonly env: AppEnvironment = environment;

  constructor() {}

  get production(): boolean {
    return this.env.production;
  }

  get oidcConfig(): OidcConfig {
    return this.env.oidc;
  }

  get apiConfig(): ApiConfig {
    return this.env.api;
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
