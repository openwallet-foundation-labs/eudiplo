import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { ApiService } from '../core';
import { TokenExpiryService } from './token-expiry.service';

describe('TokenExpiryService', () => {
  let api: {
    accessToken: string;
    getAuthenticationStatus: () => boolean;
    getTokenTimeRemaining: () => number;
    canRefreshToken: () => boolean;
    ensureAuthenticated: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };
  let notices: { action: Subject<void>; dismissed: Subject<void>; dismiss: () => void }[];
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let service: TokenExpiryService;

  const texts = () => snackBar.open.mock.calls.map((call) => call[0]);

  beforeEach(() => {
    api = {
      accessToken: 'token-1',
      getAuthenticationStatus: () => true,
      getTokenTimeRemaining: () => 60 * 60_000,
      canRefreshToken: () => false,
      ensureAuthenticated: vi.fn().mockResolvedValue(false),
      logout: vi.fn(),
    };
    router = { url: '/dashboard', navigate: vi.fn() };
    notices = [];
    snackBar = {
      open: vi.fn(() => {
        const notice = {
          action: new Subject<void>(),
          dismissed: new Subject<void>(),
          dismiss: () => notice.dismissed.next(),
        };
        notices.push(notice);
        return {
          onAction: () => notice.action,
          afterDismissed: () => notice.dismissed,
          dismiss: () => notice.dismiss(),
        };
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    service = TestBed.inject(TokenExpiryService);
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
  });

  it('warns once per token before a token without refresh expires', async () => {
    api.getTokenTimeRemaining = () => 4 * 60_000;

    await service.check();
    await service.check();
    api.accessToken = 'token-2';
    api.getTokenTimeRemaining = () => 90_000;
    await service.check();

    expect(texts()).toEqual([
      'Your session expires in 4 minutes. Save your work.',
      'Your session expires in 1 minute. Save your work.',
    ]);
  });

  it('checks every 30 seconds once started, and no longer after stop', async () => {
    vi.useFakeTimers();
    service.start();
    service.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(snackBar.open).not.toHaveBeenCalled();

    api.getTokenTimeRemaining = () => 4 * 60_000;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(snackBar.open).toHaveBeenCalledOnce();

    service.stop();
    api.accessToken = 'token-2';
    await vi.advanceTimersByTimeAsync(60_000);
    expect(snackBar.open).toHaveBeenCalledOnce();
  });

  it('stays quiet while the token can be refreshed or is far from expiry', async () => {
    await service.check();
    api.getTokenTimeRemaining = () => 60_000;
    api.canRefreshToken = () => true;
    await service.check();

    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('renews a refreshable session instead of calling it expired', async () => {
    api.getAuthenticationStatus = () => false;
    api.canRefreshToken = () => true;
    api.ensureAuthenticated.mockResolvedValue(true);

    await service.check();

    expect(api.ensureAuthenticated).toHaveBeenCalledOnce();
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('offers to log in again once the session cannot be renewed', async () => {
    api.getAuthenticationStatus = () => false;
    api.canRefreshToken = () => true;

    await service.check();
    await service.check();
    notices[0].action.next();

    expect(texts()).toEqual([
      'Your session has expired. Log in again; unsaved changes on this page will be lost.',
    ]);
    expect(api.logout).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('shows the expired notice again when another message replaced it', async () => {
    api.getAuthenticationStatus = () => false;

    await service.check();
    notices[0].dismissed.next();
    await service.check();

    expect(snackBar.open).toHaveBeenCalledTimes(2);
  });

  it('closes the expired notice once the session is valid again', async () => {
    let valid = false;
    api.getAuthenticationStatus = () => valid;
    await service.check();
    const dismiss = vi.spyOn(notices[0], 'dismiss');

    valid = true;
    await service.check();

    expect(snackBar.open).toHaveBeenCalledOnce();
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('says nothing on the login page or without a token', async () => {
    api.getAuthenticationStatus = () => false;
    router.url = '/login';
    await service.check();
    router.url = '/dashboard';
    api.accessToken = '';
    await service.check();

    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('closes the expired notice on the login page', async () => {
    api.getAuthenticationStatus = () => false;
    await service.check();
    const dismiss = vi.spyOn(notices[0], 'dismiss');

    router.url = '/login';
    await service.check();

    expect(dismiss).toHaveBeenCalledOnce();
    expect(snackBar.open).toHaveBeenCalledOnce();
  });

  it('runs one check at a time', async () => {
    let renew: (value: boolean) => void = () => undefined;
    api.getAuthenticationStatus = () => false;
    api.canRefreshToken = () => true;
    api.ensureAuthenticated.mockReturnValue(new Promise<boolean>((resolve) => (renew = resolve)));

    const first = service.check();
    const second = service.check();
    renew(true);
    await Promise.all([first, second]);

    expect(api.ensureAuthenticated).toHaveBeenCalledOnce();
  });

  it('reports an ended OIDC session whose token was cleared', async () => {
    await service.check();
    api.accessToken = '';
    api.getAuthenticationStatus = () => false;

    await service.check();

    expect(texts()).toEqual([
      'Your session has expired. Log in again; unsaved changes on this page will be lost.',
    ]);
  });
});
