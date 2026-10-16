import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { ApiService } from '../core';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  const api = { authenticated: false, kept: false, ended: false };
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/issuance/offers?page=2' } as RouterStateSnapshot;
  let navigate: MockInstance<Router['navigate']>;
  let guard: AuthGuard;

  beforeEach(() => {
    api.authenticated = false;
    api.kept = false;
    api.ended = false;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ApiService,
          useValue: {
            getAuthenticationStatus: () => api.authenticated,
            hasKeptSession: () => api.kept,
            hasEndedSession: () => api.ended,
          },
        },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    guard = TestBed.inject(AuthGuard);
  });

  it('lets a signed-in user through', () => {
    api.authenticated = true;

    expect(guard.canActivate(route, state)).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('sends a kept session to the login page with the page to return to', () => {
    api.kept = true;

    expect(guard.canActivate(route, state)).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/issuance/offers?page=2' },
    });
  });

  it('sends an expired or rejected session to the login page with the page to return to', () => {
    api.ended = true;

    expect(guard.canActivate(route, state)).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/issuance/offers?page=2' },
    });
  });

  it('sends anyone else to the login page without a return path', () => {
    expect(guard.canActivate(route, state)).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: undefined });
  });
});
