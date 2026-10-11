import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from '../core';
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
  let api: { accessToken: string; tokenRenewed$: Subject<void> };
  let router: {
    url: string;
    navigate: ReturnType<typeof vi.fn>;
    routerState: { snapshot: { root: RouteStub } };
  };
  let action: Subject<void>;
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
    api = { accessToken: '', tokenRenewed$: new Subject<void>() };
    router = {
      url: '/dashboard',
      navigate: vi.fn(),
      routerState: { snapshot: { root: routeWithRoles() } },
    };
    action = new Subject<void>();
    snackBar = { open: vi.fn(() => ({ onAction: () => action })) };
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
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
});
