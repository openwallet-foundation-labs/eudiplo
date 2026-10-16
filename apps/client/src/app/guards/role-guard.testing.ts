import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { type ActivatedRouteSnapshot, type Route, Router } from '@angular/router';
import { expect, vi } from 'vitest';

import { ApiService } from '../core';
import type { Role } from '../services/jwt.service';
import { RoleGuard } from './roles.guard';

/** An unsigned access token with the given roles and claims; JwtService only decodes it. */
export function accessToken(roles: string[], claims: Record<string, unknown> = {}): string {
  const payload = btoa(JSON.stringify({ ...claims, roles }))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return `header.${payload}.signature`;
}

/**
 * Runs the real RoleGuard and JwtService of a route against a token with the given roles.
 * Call it in beforeEach; `navigate` and `openSnackBar` record where a denied user is sent.
 */
export function roleGuardHarness() {
  let token = '';
  const navigate = vi.fn();
  const openSnackBar = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ApiService,
        useValue: {
          get accessToken() {
            return token;
          },
        },
      },
      { provide: Router, useValue: { navigate } },
      { provide: MatSnackBar, useValue: { open: openSnackBar } },
    ],
  });

  return {
    navigate,
    openSnackBar,
    /** Whether the route's RoleGuard lets a caller with these roles in. */
    canOpen(route: Route, roles: Role[]): boolean {
      expect(route.canActivate).toContain(RoleGuard);
      token = accessToken(roles);
      const snapshot = { data: route.data } as unknown as ActivatedRouteSnapshot;
      return TestBed.inject(RoleGuard).canActivate(snapshot);
    },
  };
}
