import { Injectable } from '@angular/core';
import { ApiService } from '../core';
import {
  canManageRoles,
  grantableRoles,
  grantHint,
  TENANT_ADMIN_ROLES,
  type Role,
} from './role-grants';

export { type Role, roles, TENANT_ADMIN_ROLES } from './role-grants';

export function getRole(role: Role) {
  return role;
}

export interface JWTPayload {
  iss?: string;
  sub?: string;
  tenant_id?: string | null;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  azp?: string;
  scope?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<
    string,
    {
      roles: string[];
    }
  >;
  preferred_username?: string;
  email?: string;
  name?: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root',
})
export class JwtService {
  constructor(private apiService: ApiService) {}

  /**
   * Decode a JWT token without verification
   * @param token JWT token string
   * @returns Decoded payload or null if invalid
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      const decoded = atob(payload.replaceAll('-', '+').replaceAll('_', '/'));
      return JSON.parse(decoded) as JWTPayload;
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  }

  /**
   * Checks if a specific role is inside the jwt.
   * @param role
   * @returns
   */
  hasRole(role: Role | Role[]): boolean {
    const requiredRoles = Array.isArray(role) ? role : [role];
    const tokenRoles = this.getRoles();
    return requiredRoles.some((requiredRole) => tokenRoles.includes(requiredRole));
  }

  /**
   * Roles of the signed-in caller, from `roles` or Keycloak's `realm_access.roles`.
   */
  getRoles(): string[] {
    return this.rolesOf(this.apiService.accessToken);
  }

  /** Roles of a token, from `roles` or Keycloak's `realm_access.roles`. */
  rolesOf(token: string): string[] {
    const jwt = this.decodeToken(token);
    return jwt?.roles ?? jwt?.realm_access?.roles ?? [];
  }

  /** Roles the signed-in caller may grant to clients and users. */
  grantableRoles(): Role[] {
    return grantableRoles(this.getRoles());
  }

  /** Explains to the signed-in caller which roles it can grant. */
  grantHint(): string {
    return grantHint(this.getRoles());
  }

  /** Whether the signed-in caller may change a client or user with these roles. */
  canManageRoles(targetRoles: string[]): boolean {
    return canManageRoles(this.getRoles(), targetRoles);
  }

  hasTenantContext(): boolean {
    return this.getTenantId() !== null;
  }

  /** Config Portability (bundles, detach, reset) needs a tenant and `tenant:admin` or `tenants:manage`. */
  canUseConfigPortability(): boolean {
    return this.hasTenantContext() && this.hasRole(TENANT_ADMIN_ROLES);
  }

  /**
   * Tenant of the signed-in client from the token's `tenant_id` claim, or null without one.
   */
  getTenantId(): string | null {
    const jwt = this.decodeToken(this.apiService.accessToken);
    return typeof jwt?.tenant_id === 'string' && jwt.tenant_id.length > 0 ? jwt.tenant_id : null;
  }

  /**
   * Get all client roles for a specific client
   * @param token JWT token string
   * @param clientId Client ID to get roles for
   * @returns Array of client roles
   */
  getClientRoles(token: string, clientId: string): string[] {
    const payload = this.decodeToken(token);
    return payload?.resource_access?.[clientId]?.roles || [];
  }

  /**
   * Check if token is expired
   * @param token JWT token string
   * @returns True if token is expired
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload?.exp) {
      return true;
    }
    return Date.now() >= payload.exp * 1000;
  }

  /**
   * Get user information from token
   * @param token JWT token string
   * @returns User information object
   */
  getUserInfo(token: string): { username?: string; email?: string; name?: string } | null {
    const payload = this.decodeToken(token);
    if (!payload) {
      return null;
    }

    return {
      username: payload.preferred_username,
      email: payload.email,
      name: payload.name,
    };
  }
}
