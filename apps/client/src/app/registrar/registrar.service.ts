import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '@eudiplo/sdk-angular';
import { firstValueFrom } from 'rxjs';

/**
 * Registrar configuration for connecting to an external registrar service.
 */
export interface RegistrarConfig {
  tenantId?: string;
  registrarUrl: string;
  oidcUrl: string;
  clientId: string;
  clientSecret?: string;
  username: string;
  password: string;
}

/**
 * Response from creating an access certificate.
 */
export interface AccessCertificateResponse {
  /** The registrar's certificate ID */
  id: string;
  /** The local EUDIPLO certificate ID */
  certId: string;
  /** The certificate content */
  crt: string;
}

/**
 * Service for managing registrar configuration and creating access certificates.
 */
@Injectable({
  providedIn: 'root',
})
export class RegistrarService {
  constructor(
    private readonly http: HttpClient,
    private readonly apiService: ApiService
  ) {}

  private getBaseUrl(): string {
    return this.apiService.getBaseUrl() || '';
  }

  /**
   * Get the current registrar configuration.
   */
  async getConfig(): Promise<RegistrarConfig | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<RegistrarConfig>(`${this.getBaseUrl()}/registrar/config`)
      );
      return response;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create or replace the registrar configuration.
   * Credentials are validated before saving.
   */
  async saveConfig(config: Omit<RegistrarConfig, 'tenantId'>): Promise<RegistrarConfig> {
    return firstValueFrom(
      this.http.post<RegistrarConfig>(`${this.getBaseUrl()}/registrar/config`, config)
    );
  }

  /**
   * Update the registrar configuration.
   * Credentials are validated if auth-related fields are changed.
   */
  async updateConfig(config: Partial<Omit<RegistrarConfig, 'tenantId'>>): Promise<RegistrarConfig> {
    return firstValueFrom(
      this.http.patch<RegistrarConfig>(`${this.getBaseUrl()}/registrar/config`, config)
    );
  }

  /**
   * Delete the registrar configuration.
   */
  async deleteConfig(): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.getBaseUrl()}/registrar/config`));
  }

  /**
   * Create an access certificate for a key.
   * The certificate is fetched from the registrar and stored in EUDIPLO.
   */
  async createAccessCertificate(keyId: string): Promise<AccessCertificateResponse> {
    return firstValueFrom(
      this.http.post<AccessCertificateResponse>(`${this.getBaseUrl()}/registrar/access-certificate`, {
        keyId,
      })
    );
  }
}
