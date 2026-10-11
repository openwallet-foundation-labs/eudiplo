import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from '../core';
import { RoleGuard } from '../guards/roles.guard';
import type { Role } from '../services/jwt.service';
import { sessionManagementRoutes } from './session-management.routes';

/** An unsigned access token with the given roles; JwtService only decodes it. */
function accessToken(roles: Role[]): string {
  const payload = btoa(JSON.stringify({ roles }))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return `header.${payload}.signature`;
}

describe('Session management routes', () => {
  let token: string;
  const navigate = vi.fn();
  const openSnackBar = vi.fn();

  beforeEach(() => {
    navigate.mockReset();
    openSnackBar.mockReset();
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
  });

  function canOpen(path: string, roles: Role[]): boolean {
    token = accessToken(roles);
    const route = sessionManagementRoutes.find((r) => r.path === path)!;
    expect(route.canActivate).toContain(RoleGuard);
    const snapshot = { data: route.data } as unknown as ActivatedRouteSnapshot;
    return TestBed.inject(RoleGuard).canActivate(snapshot);
  }

  // Matches the backend (session-config.controller.ts) and the nav entry in app.component.html.
  it.each<[string, Role[]]>([
    ['issuance', ['issuance:manage']],
    ['verification', ['presentation:manage']],
    ['issuance and verification', ['issuance:manage', 'presentation:manage']],
  ])('opens Session Settings for %s admins', (_, roles) => {
    expect(canOpen('config', roles)).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('denies Session Settings to clients that can only start sessions', () => {
    expect(canOpen('config', ['issuance:offer', 'presentation:request'])).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(openSnackBar).toHaveBeenCalledWith('Access denied', 'Close', { duration: 3000 });
  });

  // Matches the backend (session.controller.ts) and the All Sessions entry in app.component.html.
  it.each<[string, Role[]]>([
    ['', ['issuance:offer']],
    ['', ['presentation:request']],
    [':id', ['issuance:offer']],
    [':id', ['presentation:request']],
  ])('opens the session route "%s" for %j', (path, roles) => {
    expect(canOpen(path, roles)).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each(['', ':id'])(
    'denies the session route "%s" to clients that only manage configs',
    (path) => {
      expect(canOpen(path, ['issuance:manage', 'presentation:manage'])).toBe(false);
      expect(navigate).toHaveBeenCalledWith(['/']);
      expect(openSnackBar).toHaveBeenCalledWith('Access denied', 'Close', { duration: 3000 });
    }
  );
});
