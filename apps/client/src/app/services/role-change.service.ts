import { Injectable, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiRefusalService, ApiService } from '../core';
import { JwtService, type Role } from './jwt.service';

interface SeenToken {
  client?: string;
  roles: string[];
}

/**
 * Tells the user when the API client lost roles while signed in. The backend
 * checks the client's current roles, the menu those of the token, so each new
 * token of the same client is compared with the one before. A page that needs
 * a lost role is left only on request, so unsaved changes can be copied first.
 * A tab without the client secret cannot get a new token; when the backend's
 * role check refuses a page whose roles the token has, it asks for a new login.
 */
@Injectable({ providedIn: 'root' })
export class RoleChangeService implements OnDestroy {
  private subscription?: Subscription;
  private seen?: SeenToken;
  /** Token for which a new login was suggested. */
  private hintedToken?: string;

  constructor(
    private readonly apiService: ApiService,
    private readonly refusals: ApiRefusalService,
    private readonly jwtService: JwtService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {}

  start(): void {
    if (this.subscription) return;
    this.seen = this.current();
    this.subscription = this.apiService.tokenRenewed$.subscribe(() => this.compare());
    this.subscription.add(
      this.refusals.rolesRefusedWithoutRenewal$.subscribe(() => this.suggestLogin())
    );
  }

  stop(): void {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private compare(): void {
    const before = this.seen;
    const now = this.current();
    this.seen = now;
    // A sign-in, also with another client, starts over.
    if (!before || !now || before.client !== now.client || this.router.url.startsWith('/login')) {
      return;
    }
    const lost = before.roles.filter((role) => !now.roles.includes(role));
    if (lost.length === 0) return;

    const named = lost.length === 1 ? `the role ${lost[0]}` : `the roles ${lost.join(', ')}`;
    if (this.requiredRoles().some((required) => !this.jwtService.hasRole(required))) {
      this.snackBar
        .open(
          `Your API client no longer has ${named}, which this page needs. Copy unsaved changes before you leave it.`,
          'Leave page',
          { duration: 0, panelClass: ['warning-snackbar'] }
        )
        .onAction()
        .subscribe(() => void this.router.navigate(['/']));
      return;
    }
    this.snackBar.open(
      `Your API client no longer has ${named}; the pages that need ${lost.length === 1 ? 'it' : 'them'} are hidden.`,
      'OK',
      { duration: 10_000, panelClass: ['warning-snackbar'] }
    );
  }

  /**
   * The backend's role check refused the token, which has the roles this page
   * needs, so the client may have lost one. Without the secret no new token can
   * tell, and only a new login gets one. On a page without a role, or whose
   * roles the token lacks, the request may need a role the client never had.
   */
  private suggestLogin(): void {
    const token = this.apiService.accessToken;
    if (!token || token === this.hintedToken || this.router.url.startsWith('/login')) return;
    const required = this.requiredRoles();
    if (required.length === 0 || !required.every((role) => this.jwtService.hasRole(role))) return;
    this.hintedToken = token;
    this.showHint(token, true);
  }

  /**
   * The page's own error for the refused request often replaces the hint, so
   * it comes back once. Replaced again, it waits for the next refusal; this
   * way it never takes turns with another notice that comes back by itself.
   */
  private showHint(token: string, reopen: boolean): void {
    const hint = this.snackBar.open(
      'Your API client may have lost a role this page needs: the backend refused a request for missing roles. Log in again to get its current roles; unsaved changes on this page will be lost.',
      'Log in',
      { duration: 0, panelClass: ['warning-snackbar'] }
    );
    hint.afterDismissed().subscribe((dismissal) => {
      if (dismissal?.dismissedByAction || this.hintedToken !== token) return;
      if (
        reopen &&
        this.apiService.accessToken === token &&
        !this.router.url.startsWith('/login')
      ) {
        this.showHint(token, false);
      } else {
        this.hintedToken = undefined;
      }
    });
    hint.onAction().subscribe(() => {
      this.apiService.logout();
      void this.router.navigate(['/login']);
    });
  }

  private current(): SeenToken | undefined {
    const token = this.apiService.accessToken;
    if (!token) return undefined;
    return {
      client: this.jwtService.decodeToken(token)?.sub,
      roles: this.jwtService.rolesOf(token),
    };
  }

  /** The `data.role` of the current page and the routes above it, as RoleGuard checks it. */
  private requiredRoles(): (Role | Role[])[] {
    const required: (Role | Role[])[] = [];
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    while (route) {
      const role = route.data['role'] as Role | Role[] | undefined;
      if (role) required.push(role);
      route = route.firstChild;
    }
    return required;
  }
}
