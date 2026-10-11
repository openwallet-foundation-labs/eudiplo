import { describe, expect, it } from 'vitest';
import { RoleGuard } from '../guards/roles.guard';
import { schemaRoutes } from './schema.routes';

describe('schemaRoutes', () => {
  it('lets only users with issuance:manage open Create Schema', () => {
    const create = schemaRoutes.find((route) => route.path === 'create');

    expect(create?.canActivate).toEqual([RoleGuard]);
    expect(create?.data).toEqual({ role: 'issuance:manage' });
  });
});
