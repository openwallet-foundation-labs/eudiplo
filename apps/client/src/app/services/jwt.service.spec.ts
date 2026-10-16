import { describe, expect, it } from 'vitest';
import type { ApiService } from '../core';
import { JwtService } from './jwt.service';

function serviceFor(payload: object): JwtService {
  const encoded = btoa(JSON.stringify(payload)).replaceAll('=', '');
  return new JwtService({ accessToken: `e30.${encoded}.sig` } as ApiService);
}

describe('JwtService roles', () => {
  it('reads the roles claim', () => {
    expect(serviceFor({ roles: ['clients:manage'] }).getRoles()).toEqual(['clients:manage']);
  });

  it("falls back to Keycloak's realm roles", () => {
    const service = serviceFor({ realm_access: { roles: ['issuance:offer', 'users:manage'] } });
    expect(service.getRoles()).toEqual(['issuance:offer', 'users:manage']);
    expect(service.grantableRoles()).toEqual(['issuance:offer', 'users:manage']);
    expect(service.hasRole('users:manage')).toBe(true);
  });
});
