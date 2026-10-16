import { RoleDto } from '@eudiplo/sdk-core';

/**
 * The backend's role rules for granting roles and changing clients and users
 * (`apps/backend/src/auth/roles/role-grants.ts`), used to offer only what the
 * backend will accept. The backend has the final say.
 */

export type Role = RoleDto['role'];

// A record, so the build fails when the SDK knows a role that is missing here.
const roleSet: Record<Role, true> = {
  'audit:read': true,
  'clients:manage': true,
  'credentials:status': true,
  'issuance:manage': true,
  'issuance:offer': true,
  'keys:manage': true,
  'presentation:manage': true,
  'presentation:request': true,
  'registrar:manage': true,
  'sessions:read': true,
  'tenant:admin': true,
  'tenants:manage': true,
  'users:manage': true,
};

export const roles = Object.keys(roleSet) as Role[];

/** Roles that only a caller with `tenants:manage` can grant. */
const reservedRoles: ReadonlySet<Role> = new Set<Role>(['tenants:manage', 'tenant:admin']);

/**
 * Roles a caller may grant to clients and users, as the backend checks them:
 * every role with `tenants:manage`; with `tenant:admin` every role except the
 * reserved ones; otherwise the roles it holds, except the reserved ones.
 */
export function grantableRoles(callerRoles: string[]): Role[] {
  if (callerRoles.includes('tenants:manage')) return roles;
  const source = callerRoles.includes('tenant:admin')
    ? roles
    : roles.filter((role) => callerRoles.includes(role));
  return source.filter((role) => !reservedRoles.has(role));
}

/** Explains to the caller which roles it can grant. */
export function grantHint(callerRoles: string[]): string {
  if (callerRoles.includes('tenants:manage')) return 'You can grant every role.';
  if (callerRoles.includes('tenant:admin')) {
    return 'You can grant every role except tenants:manage and tenant:admin.';
  }
  return 'You can grant only roles you hold, except tenants:manage and tenant:admin.';
}

/**
 * Whether a caller may change, delete or rotate the secret of a client or user
 * with `targetRoles`: it must hold or be able to grant each of them. Unlike
 * the backend, it ignores role names EUDIPLO does not know, since user lists
 * contain Keycloak's default roles; the backend has the final say.
 */
export function canManageRoles(callerRoles: string[], targetRoles: string[]): boolean {
  const grantable = grantableRoles(callerRoles);
  return targetRoles.every(
    (role) =>
      !roles.includes(role as Role) ||
      grantable.includes(role as Role) ||
      callerRoles.includes(role)
  );
}

/** A role in the roles select of a client or user form. */
export interface RoleOption {
  role: string;
  /** Cannot be changed: a role of the edited client or user the caller neither holds nor may grant */
  locked: boolean;
}

/**
 * Role choices of a client or user form. The caller can pick every role it may
 * grant, and keep or remove the other EUDIPLO roles of the edited client or
 * user that it holds; it cannot re-add those once saved. Roles it neither
 * holds nor may grant stay selected and locked; `unmanageable` lists them,
 * since they keep the caller from changing the client or user at all.
 */
export function roleChoices(
  callerRoles: string[],
  targetRoles: string[] = []
): { options: RoleOption[]; unmanageable: string[] } {
  const grantable = grantableRoles(callerRoles);
  const kept = targetRoles.filter(
    (role) => roles.includes(role as Role) && !grantable.includes(role as Role)
  );
  return {
    options: [
      ...grantable.map((role) => ({ role, locked: false })),
      ...kept.map((role) => ({ role, locked: !callerRoles.includes(role) })),
    ],
    unmanageable: targetRoles.filter((role) => !canManageRoles(callerRoles, [role])),
  };
}
