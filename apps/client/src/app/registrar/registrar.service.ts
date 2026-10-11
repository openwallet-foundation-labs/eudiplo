import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../core';
import { firstValueFrom } from 'rxjs';
import type { RegistrarControllerCreateAccessCertificateResponse } from '@eudiplo/sdk-core';

/**
 * Registrar configuration response from the API.
 * The password and client secret are never returned for security reasons; instead
 * hasPassword and hasClientSecret indicate if one is set.
 */
export interface RegistrarConfig {
  tenantId?: string;
  registrarUrl: string;
  oidcUrl: string;
  clientId: string;
  username: string;
  registrationCertificateDefaults?: Record<string, unknown> | null;
  /** Indicates whether a password is configured (actual password is never returned) */
  hasPassword: boolean;
  /** Indicates whether a client secret is configured (actual secret is never returned) */
  hasClientSecret: boolean;
}

/**
 * Registrar configuration for create/update requests.
 */
export interface RegistrarConfigRequest {
  registrarUrl: string;
  oidcUrl: string;
  clientId: string;
  clientSecret?: string;
  username: string;
  registrationCertificateDefaults?: Record<string, unknown> | null;
  password?: string;
}

/**
 * Response from creating an access certificate.
 */
export type AccessCertificateResponse = RegistrarControllerCreateAccessCertificateResponse;

/**
 * Why EUDIPLO refused an access certificate request. It refuses before it
 * stores the certificate, its last step, so the key has none: `role` (403)
 * without registrar:manage; `registrar` (400) when the registrar
 * authentication, the relying party registration or the certificate request
 * fails, or (404) without registrar configuration or key. The backend's
 * access-certificate.service.spec.ts pins that order.
 */
export type AccessCertificateRefusal = 'role' | 'registrar';

/**
 * Why a failed {@link RegistrarService.createAccessCertificate} was refused;
 * undefined when it failed otherwise and the certificate may have been stored.
 */
export function accessCertificateRefusal(error: unknown): AccessCertificateRefusal | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 403) return 'role';
  if (status === 400 || status === 404) return 'registrar';
  return undefined;
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
        this.http.get<RegistrarConfig>(`${this.getBaseUrl()}/api/registrar/config`)
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
  async saveConfig(config: RegistrarConfigRequest): Promise<RegistrarConfig> {
    return firstValueFrom(
      this.http.post<RegistrarConfig>(`${this.getBaseUrl()}/api/registrar/config`, config)
    );
  }

  /**
   * Update the registrar configuration.
   * Credentials are validated if auth-related fields are changed.
   */
  async updateConfig(config: Partial<RegistrarConfigRequest>): Promise<RegistrarConfig> {
    return firstValueFrom(
      this.http.patch<RegistrarConfig>(`${this.getBaseUrl()}/api/registrar/config`, config)
    );
  }

  /**
   * Delete the registrar configuration.
   */
  async deleteConfig(): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.getBaseUrl()}/api/registrar/config`));
  }

  /**
   * Create an access certificate for a key.
   * The certificate is fetched from the registrar and stored in EUDIPLO.
   */
  async createAccessCertificate(keyId: string): Promise<AccessCertificateResponse> {
    return firstValueFrom(
      this.http.post<AccessCertificateResponse>(
        `${this.getBaseUrl()}/api/registrar/access-certificate`,
        {
          keyId,
        }
      )
    );
  }
}
