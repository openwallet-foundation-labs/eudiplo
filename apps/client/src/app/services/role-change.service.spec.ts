import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRefusalService, ApiService } from '../core';
import { accessToken } from '../guards/role-guard.testing';
import { RoleChangeService } from './role-change.service';

interface RouteStub {
  data: { role?: string | string[] };
  firstChild: RouteStub | null;
}

/** A router state whose routes, from the root down, carry these `data.role` values. */
function routeWithRoles(...roles: (string | string[] | undefined)[]): RouteStub {
  const [first, ...rest] = roles;
  return {
    data: first ? { role: first } : {},
    firstChild: rest.length ? routeWithRoles(...rest) : null,
  };
}

describe('RoleChangeService', () => {
  let api: { accessToken: string; tokenRenewed$: Subject<void>; logout: ReturnType<typeof vi.fn> };
  let rolesRefused: Subject<void>;
  let router: {
    url: string;
    navigate: ReturnType<typeof vi.fn>;
    routerState: { snapshot: { root: RouteStub } };
  };
  let action: Subject<void>;
  /** The `afterDismissed` of each opened snack bar, in order. */
  let dismissals: Subject<{ dismissedByAction: boolean }>[];
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let service: RoleChangeService;

  const texts = () => snackBar.open.mock.calls.map((call) => call[0]);

  /** Signs in as `client` with `roles` and starts the service. */
  function signIn(roles: string[], client = 'shop'): void {
    api.accessToken = accessToken(roles, { sub: client });
    service.start();
  }

  /** A new token of `client` arrives, for example after a refresh. */
  function renew(roles: string[], client = 'shop'): void {
    api.accessToken = accessToken(roles, { sub: client });
    api.tokenRenewed$.next();
  }

  beforeEach(() => {
    api = { accessToken: '', tokenRenewed$: new Subject<void>(), logout: vi.fn() };
    rolesRefused = new Subject<void>();
    router = {
      url: '/dashboard',
      navigate: vi.fn(),
      routerState: { snapshot: { root: routeWithRoles() } },
    };
    action = new Subject<void>();
    dismissals = [];
    snackBar = {
      open: vi.fn(() => {
        const dismissed = new Subject<{ dismissedByAction: boolean }>();
        dismissals.push(dismissed);
        return { onAction: () => action, afterDismissed: () => dismissed };
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        {
          provide: ApiRefusalService,
          useValue: { rolesRefusedWithoutRenewal$: rolesRefused.asObservable() },
        },
        { provide: Router, useValue: router },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    service = TestBed.inject(RoleChangeService);
  });

  afterEach(() => service.stop());

  it('names the lost roles while the page does not need them', () => {
    router.routerState.snapshot.root = routeWithRoles(undefined, 'presentation:manage');
    signIn(['presentation:manage', 'issuance:manage', 'clients:manage']);

    renew(['presentation:manage']);

    expect(texts()).toEqual([
      'Your API client no longer has the roles issuance:manage, clients:manage; the pages that need them are hidden.',
    ]);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('offers to leave a page that needs a lost role, and leaves only on request', () => {
    router.routerState.snapshot.root = routeWithRoles(undefined, 'issuance:manage');
    signIn(['presentation:manage', 'issuance:manage']);

    renew(['presentation:manage']);

    expect(texts()).toEqual([
      'Your API client no longer has the role issuance:manage, which this page needs. Copy unsaved changes before you leave it.',
    ]);
    expect(snackBar.open.mock.calls[0][1]).toBe('Leave page');
    expect(snackBar.open.mock.calls[0][2]).toMatchObject({ duration: 0 });
    expect(router.navigate).not.toHaveBeenCalled();

    action.next();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('stays quiet on a page that needs any of several roles while one is left', () => {
    router.routerState.snapshot.root = routeWithRoles(['issuance:manage', 'presentation:manage']);
    signIn(['presentation:manage', 'issuance:manage']);

    renew(['presentation:manage']);

    expect(snackBar.open.mock.calls[0][1]).toBe('OK');
  });

  it('compares each new token with the one before', () => {
    signIn(['presentation:manage', 'issuance:manage']);

    renew(['presentation:manage', 'issuance:manage']);
    renew(['presentation:manage']);
    renew(['presentation:manage']);

    expect(snackBar.open).toHaveBeenCalledOnce();
  });

  it('says nothing for another client, on the login page, after logout or after stop', () => {
    signIn(['presentation:manage', 'issuance:manage']);

    renew(['presentation:manage'], 'other');
    router.url = '/login';
    renew([], 'other');
    router.url = '/dashboard';
    api.accessToken = '';
    api.tokenRenewed$.next();
    renew([], 'other');
    service.stop();
    renew([], 'other');

    expect(snackBar.open).not.toHaveBeenCalled();
  });

  describe('without a secret to renew the token', () => {
    const hint =
      'Your API client may have lost a role this page needs: the backend refused a request for missing roles. Log in again to get its current roles; unsaved changes on this page will be lost.';

    it('suggests a new login once per token when the role check refuses a page the token may open', () => {
      router.routerState.snapshot.root = routeWithRoles(undefined, 'issuance:manage');
      signIn(['presentation:manage', 'issuance:manage']);

      rolesRefused.next();
      rolesRefused.next();

      expect(texts()).toEqual([hint]);
      expect(snackBar.open.mock.calls[0][1]).toBe('Log in');
      expect(snackBar.open.mock.calls[0][2]).toMatchObject({ duration: 0 });
      expect(api.logout).not.toHaveBeenCalled();

      action.next();
      expect(api.logout).toHaveBeenCalledOnce();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);

      // A new token, for example from a new login, gets the hint again.
      signIn(['issuance:manage']);
      rolesRefused.next();
      expect(texts()).toEqual([hint, hint]);
    });

    it('suggests a new login on a page that needs any of several roles the token has one of', () => {
      router.routerState.snapshot.root = routeWithRoles(['issuance:manage', 'presentation:manage']);
      signIn(['presentation:manage']);

      rolesRefused.next();

      expect(texts()).toEqual([hint]);
    });

    it('comes back once when another message replaces it, then with the next refusal', () => {
      router.routerState.snapshot.root = routeWithRoles(undefined, 'issuance:manage');
      signIn(['issuance:manage']);

      rolesRefused.next();
      // For example the page's own "Failed to save" message.
      dismissals[0].next({ dismissedByAction: false });
      expect(texts()).toEqual([hint, hint]);

      // Replaced again, for example by a notice that comes back by itself.
      dismissals[1].next({ dismissedByAction: false });
      expect(texts()).toEqual([hint, hint]);
      rolesRefused.next();
      expect(texts()).toEqual([hint, hint, hint]);
    });

    it('does not come back for a replaced token or on the login page', () => {
      router.routerState.snapshot.root = routeWithRoles(undefined, 'issuance:manage');
      signIn(['issuance:manage']);
      rolesRefused.next();
      router.url = '/login';
      dismissals[0].next({ dismissedByAction: false });

      router.url = '/dashboard';
      rolesRefused.next();
      api.accessToken = accessToken(['issuance:manage'], { sub: 'shop', jti: 'next' });
      dismissals[1].next({ dismissedByAction: false });

      expect(texts()).toEqual([hint, hint]);
    });

    it('keeps the hint of a new token when the hint of an older one closes late', () => {
      router.routerState.snapshot.root = routeWithRoles(undefined, 'issuance:manage');
      signIn(['issuance:manage']);
      rolesRefused.next();

      signIn(['issuance:manage', 'presentation:manage']);
      rolesRefused.next();
      dismissals[0].next({ dismissedByAction: false });
      rolesRefused.next();

      expect(texts()).toEqual([hint, hint]);
    });

    it('does not show the hint again for a token after its Log in action', () => {
      router.routerState.snapshot.root = routeWithRoles(undefined, 'issuance:manage');
      signIn(['issuance:manage']);

      rolesRefused.next();
      dismissals[0].next({ dismissedByAction: true });
      rolesRefused.next();

      expect(texts()).toEqual([hint]);
    });

    it('stays quiet where a new token would be refused too', () => {
      signIn(['presentation:manage']);

      // A page without a role, a page whose role the token lacks, the login page.
      rolesRefused.next();
      router.routerState.snapshot.root = routeWithRoles(undefined, 'issuance:manage');
      rolesRefused.next();
      router.routerState.snapshot.root = routeWithRoles(undefined, 'presentation:manage');
      router.url = '/login';
      rolesRefused.next();
      router.url = '/dashboard';
      api.accessToken = '';
      rolesRefused.next();
      signIn(['presentation:manage']);
      service.stop();
      rolesRefused.next();

      expect(snackBar.open).not.toHaveBeenCalled();
    });
  });
});
