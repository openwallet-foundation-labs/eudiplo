import { Injectable, OnDestroy } from '@angular/core';
import { client } from '@eudiplo/sdk-core';
import { Subject } from 'rxjs';
import { ApiService } from './api.service';
import { OidcService } from './oidc.service';

/** Shortest time between two token renewals after a `403`. */
const roleRenewalIntervalMs = 60_000;

/** The token of an `Authorization: Bearer` header. */
function bearerToken(header: string | null | undefined): string | undefined {
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
}

/**
 * Reacts to refused calls of the management API. The backend reads the client
 * behind a built-in token on every request: it answers `401` once the client is
 * deleted or has a new secret, and `403` for roles the client no longer has. A new token tells
 * whether the client still exists and carries its current roles. With OIDC,
 * keycloak-js keeps the session.
 */
@Injectable({ providedIn: 'root' })
export class ApiRefusalService implements OnDestroy {
  /** Token the backend refused and that no new token replaced. */
  private refusedToken?: string;
  /** Token issued because the backend refused the one before. */
  private tokenAfterRefusal?: string;
  private rolesRenewedAt = 0;
  private readonly revoked = new Subject<void>();
  /** Emits when the backend refuses the token and no new one can be had. */
  readonly accessRevoked$ = this.revoked.asObservable();

  constructor(
    private readonly apiService: ApiService,
    private readonly oidcService: OidcService
  ) {
    client.interceptors.response.use(this.onSdkResponse);
  }

  ngOnDestroy(): void {
    client.interceptors.response.eject(this.onSdkResponse);
  }

  private readonly onSdkResponse = (response: Response, request: Request): Response => {
    this.handleApiResponse(response.status, bearerToken(request.headers.get('Authorization')));
    return response;
  };

  /** Reacts to an answer of the management API to a request sent with `token`. */
  handleApiResponse(status: number, token: string | undefined): void {
    if (this.oidcService.mode === 'oidc' || !token || token !== this.apiService.accessToken) {
      return;
    }
    if (status === 401) {
      void this.renewRefusedToken(token);
    } else if (status === 403) {
      void this.renewForRoles();
    }
  }

  /** True while the backend refuses the current token and no new one can be had. */
  isAccessRevoked(): boolean {
    return this.refusedToken !== undefined && this.refusedToken === this.apiService.accessToken;
  }

  private async renewRefusedToken(token: string): Promise<void> {
    if (token === this.refusedToken) return;
    // A token issued after a refusal is refused too: the client has no access.
    if (token !== this.tokenAfterRefusal && this.apiService.canRefreshToken()) {
      try {
        await this.apiService.refreshAccessToken();
        this.tokenAfterRefusal = this.apiService.accessToken;
        return;
      } catch {
        // While the backend is down, the session is kept and the refresh retried.
        if (!this.apiService.areCredentialsRejected()) return;
      }
    }
    // The backend refuses an expired token as it should; TokenExpiryService reports
    // the expiry, for example of a reloaded session, which cannot renew its token.
    if (this.apiService.getTokenTimeRemaining() === 0) return;
    // Concurrent refusals of the same token report it once.
    if (token !== this.apiService.accessToken || token === this.refusedToken) return;
    this.refusedToken = token;
    this.revoked.next();
  }

  /** A new token carries the client's current roles, so the menu follows them. */
  private async renewForRoles(): Promise<void> {
    const now = Date.now();
    if (now - this.rolesRenewedAt < roleRenewalIntervalMs || !this.apiService.canRefreshToken()) {
      return;
    }
    this.rolesRenewedAt = now;
    // A failed refresh is reported like any other.
    await this.apiService.refreshAccessToken().catch(() => undefined);
  }
}
