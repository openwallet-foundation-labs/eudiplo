import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../core';
import { firstValueFrom } from 'rxjs';
import type {
  CreateAccessKeyChainDto,
  RegistrarControllerCreateAccessKeyChainResponse,
} from '@eudiplo/sdk-core';

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
 * Response from creating an access key enrolled at the registrar.
 */
export type AccessCertificateResponse = RegistrarControllerCreateAccessKeyChainResponse;

/**
 * How {@link RegistrarService.createAccessKeyChain} failed, which decides
 * what the user can do next:
 * - `role` (403): the caller lacks registrar:manage; no key was created.
 * - `registrar` (400 or 404 caused by the registrar): its authentication, the
 *   relying party registration or the certificate request failed, or there
 *   is no registrar configuration; EUDIPLO kept no key.
 * - `refused` (another 400 or 404, for example an unknown KMS provider): no
 *   key was kept, and the registrar configuration is not the cause.
 * - `keyLeft` (5xx naming a key chain): EUDIPLO could not delete the new key
 *   chain `keyId`, which has no registrar certificate.
 * - `failed` (another 5xx from EUDIPLO): EUDIPLO kept no key.
 * - `unknown` (no answer, or 502, 503 or 504 from a proxy): the request may
 *   still have created and enrolled a key.
 *
 * The backend's access-certificate.service.spec.ts pins the messages read here.
 */
export type AccessKeyEnrollmentFailure =
  | { kind: 'role' | 'registrar' | 'refused' | 'failed' | 'unknown' }
  | { kind: 'keyLeft'; keyId: string };

const GATEWAY_STATUSES = new Set([0, 502, 503, 504]);
const KEY_LEFT_MESSAGE = /The new access key chain (\S+) could not be deleted/;
const REGISTRAR_CAUSE = /registrar|access certificate/i;

export function accessKeyEnrollmentFailure(error: unknown): AccessKeyEnrollmentFailure {
  const { status, error: body } = (error ?? {}) as { status?: number; error?: unknown };
  const message =
    typeof (body as { message?: unknown } | null)?.message === 'string'
      ? (body as { message: string }).message
      : '';
  if (status === undefined || GATEWAY_STATUSES.has(status)) return { kind: 'unknown' };
  if (status === 403) return { kind: 'role' };
  if (status === 400 || status === 404) {
    return { kind: REGISTRAR_CAUSE.test(message) ? 'registrar' : 'refused' };
  }
  const keyLeft = KEY_LEFT_MESSAGE.exec(message);
  if (keyLeft) return { kind: 'keyLeft', keyId: keyLeft[1] };
  return { kind: status >= 500 ? 'failed' : 'refused' };
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
   * Create a standalone access key and enroll it at the registrar in one
   * request. When the enrollment fails, the backend deletes the key again.
   */
  async createAccessKeyChain(body: CreateAccessKeyChainDto): Promise<AccessCertificateResponse> {
    return firstValueFrom(
      this.http.post<AccessCertificateResponse>(
        `${this.getBaseUrl()}/api/registrar/access-key-chain`,
        body
      )
    );
  }
}
