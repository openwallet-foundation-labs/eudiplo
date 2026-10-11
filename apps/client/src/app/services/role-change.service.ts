import { Injectable, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../core';
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
 */
@Injectable({ providedIn: 'root' })
export class RoleChangeService implements OnDestroy {
  private subscription?: Subscription;
  private seen?: SeenToken;

  constructor(
    private readonly apiService: ApiService,
    private readonly jwtService: JwtService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {}

  start(): void {
    if (this.subscription) return;
    this.seen = this.current();
    this.subscription = this.apiService.tokenRenewed$.subscribe(() => this.compare());
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
