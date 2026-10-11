import { beforeEach, describe, expect, it } from 'vitest';

import { routes } from './app.routes';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/roles.guard';
import { roleGuardHarness } from './guards/role-guard.testing';
import type { Role } from './services/jwt.service';

describe('Trust list route', () => {
  let guard: ReturnType<typeof roleGuardHarness>;

  beforeEach(() => {
    guard = roleGuardHarness();
  });

  function canOpen(roles: Role[]): boolean {
    const route = routes.find((r) => r.path === 'trust-list')!;
    expect(route.canActivate).toEqual([AuthGuard, RoleGuard]);
    return guard.canOpen(route, roles);
  }

  // Matches the backend (trustlist.controller.ts) and the nav entry in app.component.html.
  it.each<[string, Role[]]>([
    ['issuance', ['issuance:manage']],
    ['verification', ['presentation:manage']],
    ['issuance and verification', ['issuance:manage', 'presentation:manage']],
  ])('opens Trust Lists for %s admins', (_, roles) => {
    expect(canOpen(roles)).toBe(true);
    expect(guard.navigate).not.toHaveBeenCalled();
  });

  it('denies Trust Lists to clients that can only start sessions', () => {
    expect(canOpen(['issuance:offer', 'presentation:request'])).toBe(false);
    expect(guard.navigate).toHaveBeenCalledWith(['/']);
    expect(guard.openSnackBar).toHaveBeenCalledWith('Access denied', 'Close', { duration: 3000 });
  });
});
