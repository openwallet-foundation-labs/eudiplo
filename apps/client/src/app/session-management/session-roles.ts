import type { Session } from '@eudiplo/sdk-core';
import type { Role } from '../services/jwt.service';
import { isPresentationSession } from './session-management.service';

/**
 * The backend's role checks of the session endpoints
 * (`apps/backend/src/session/session.controller.ts`, `session-scope.ts`),
 * used to offer only what the backend accepts. The backend has the final say.
 */

/** Roles that read the session list, a session, its logs and the session counts. */
export const SESSION_READER_ROLES: Role[] = [
  'issuance:offer',
  'presentation:request',
  'sessions:read',
];

/** Roles that cancel and delete sessions, each within its side (`sessionSideRoles`). */
export const SESSION_CHANGER_ROLES: Role[] = ['issuance:offer', 'presentation:request'];

/** Roles that read the credential status of an issuance session. */
export const CREDENTIAL_STATUS_READER_ROLES: Role[] = [
  'issuance:offer',
  'issuance:manage',
  'credentials:status',
  'sessions:read',
];

/** Roles that revoke, suspend or reinstate credentials. */
export const CREDENTIAL_STATUS_CHANGER_ROLES: Role[] = ['credentials:status', 'issuance:manage'];

/**
 * Roles that make a session's type the caller's side: the caller may cancel
 * and delete such sessions (with one of `SESSION_CHANGER_ROLES`) and gets
 * their offer or request. `sessions:read` reads both types but is no side.
 */
function sessionSideRoles(session: Pick<Session, 'requestId'>): Role[] {
  return isPresentationSession(session)
    ? ['presentation:request', 'presentation:manage']
    : ['issuance:offer', 'issuance:manage'];
}

/**
 * Whether the caller may cancel and delete this session: one of
 * `SESSION_CHANGER_ROLES` for the endpoints, and the session's side.
 */
export function maySessionChange(
  hasRole: (roles: Role[]) => boolean,
  session: Pick<Session, 'requestId'>
): boolean {
  return hasRole(SESSION_CHANGER_ROLES) && hasRole(sessionSideRoles(session));
}

/** The role of the page that creates sessions of this type again. */
export function sessionOfferRole(session: Pick<Session, 'requestId'>): Role {
  return isPresentationSession(session) ? 'presentation:request' : 'issuance:offer';
}
