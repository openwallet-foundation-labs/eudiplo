import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { OAuth2HttpError } from '@badgateway/oauth2-client';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, type MockInstance, vi } from 'vitest';

import { ApiService } from '../core';
import { OidcService } from '../core/oidc.service';
import { EnvironmentService } from '../services/environment.service';
import { LoginComponent } from './login.component';

describe('LoginComponent with a kept session', () => {
  const rejectedText =
    'The credentials of client-a were rejected, for example because the client was deleted or its secret changed. Log in again.';

  let api: {
    authenticated: boolean;
    kept: boolean;
    /** The session the service reports as rejected, once. */
    rejected?: { clientId: string; baseUrl?: string };
    tokenRenewed$: Subject<void>;
    sessionEnded$: Subject<void>;
    refreshAccessToken: Mock<() => Promise<void>>;
    loginWithClientCredentials: Mock<() => Promise<void>>;
    logout: Mock<() => void>;
  };
  let queryParams: Record<string, string>;
  let snackBar: { open: Mock };
  let navigateByUrl: MockInstance<Router['navigateByUrl']>;
  let fixture: ComponentFixture<LoginComponent>;

  const page = () => fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    [...page().querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  const input = (name: string) =>
    page().querySelector<HTMLInputElement>(`input[formcontrolname="${name}"]`);
  const snackTexts = () => snackBar.open.mock.calls.map((call) => call[0]);

  function render(): void {
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  }

  /** The real service forgets the credentials and emits sessionEnded$ when the token endpoint rejects them. */
  function rejectKeptCredentials(): void {
    api.rejected = { clientId: 'client-a', baseUrl: 'http://backend.test' };
    api.sessionEnded$.next();
  }

  /** Signs in through the form as the given client, on the Client ID and Secret tab. */
  async function submitForm(clientId: string, apiUrl: string): Promise<void> {
    const component = fixture.componentInstance;
    component.selectedLoginMode = 'client';
    component.loginForm.setValue({ clientId, clientSecret: 'secret', apiUrl });
    await component.onSubmit();
  }

  beforeEach(() => {
    api = {
      authenticated: false,
      kept: true,
      tokenRenewed$: new Subject<void>(),
      sessionEnded$: new Subject<void>(),
      refreshAccessToken: vi.fn(() => Promise.resolve()),
      loginWithClientCredentials: vi.fn(() => Promise.resolve()),
      // Like the real service, logout forgets the credentials and says so.
      logout: vi.fn(() => api.sessionEnded$.next()),
    };
    queryParams = {};
    snackBar = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        {
          provide: ApiService,
          useValue: {
            getAuthenticationStatus: () => api.authenticated,
            hasKeptSession: () => api.kept,
            takeRejectedSession: () => {
              const session = api.rejected;
              api.rejected = undefined;
              return session;
            },
            getClientId: () => 'client-a',
            getBaseUrl: () => 'http://backend.test',
            tokenRenewed$: api.tokenRenewed$,
            sessionEnded$: api.sessionEnded$,
            refreshAccessToken: api.refreshAccessToken,
            loginWithClientCredentials: api.loginWithClientCredentials,
            logout: api.logout,
            fetchDiscovery: () => Promise.resolve({}),
          },
        },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams } } },
        {
          provide: EnvironmentService,
          useValue: {
            isDevelopment: () => false,
            getEnvironment: () => ({
              oidc: { clientId: '', clientSecret: '' },
              api: { baseUrl: '' },
            }),
          },
        },
        { provide: OidcService, useValue: {} },
      ],
    })
      // The component imports MatSnackBarModule, whose provider wins over a root provider.
      .overrideProvider(MatSnackBar, { useValue: snackBar });
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  it('waits for the kept session instead of asking for credentials', () => {
    render();

    expect(page().querySelector('[role="status"]')?.textContent).toContain(
      'Resuming the session of client-a at http://backend.test'
    );
    expect(page().querySelector('form')).toBeNull();
  });

  it('renews the kept session at once, as nothing else may be due', () => {
    render();

    expect(api.refreshAccessToken).toHaveBeenCalledOnce();
  });

  it('shows the form when there is no kept session', () => {
    api.kept = false;
    render();

    expect(page().querySelector('form')).not.toBeNull();
    expect(page().querySelector('[role="status"]')).toBeNull();
    expect(api.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('returns to the page the user came from once the session renews', () => {
    queryParams['returnUrl'] = '/issuance/offers?page=2';
    render();

    api.tokenRenewed$.next();

    expect(navigateByUrl).toHaveBeenCalledWith('/issuance/offers?page=2');
  });

  it.each(['https://evil.test/', '//evil.test/', '/login?returnUrl=/dashboard'])(
    'opens the dashboard instead of the return path %s',
    (returnUrl) => {
      queryParams['returnUrl'] = returnUrl;
      api.authenticated = true;
      render();

      expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
    }
  );

  it('shows the form, started from the kept session, when its credentials are rejected', async () => {
    render();

    rejectKeptCredentials();
    fixture.detectChanges();

    expect(page().querySelector('form')).not.toBeNull();
    expect(input('apiUrl')?.value).toBe('http://backend.test');
    // The client ID field sits on the second tab, which is not rendered yet.
    expect(fixture.componentInstance.loginForm.value.clientId).toBe('client-a');
    expect(snackTexts()).toEqual([rejectedText]);
    expect(navigateByUrl).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(document.activeElement).toBe(input('apiUrl')));
  });

  it('explains a rejection that happened before the page opened, starting from that session', () => {
    api.kept = false;
    api.rejected = { clientId: 'client-a', baseUrl: 'http://backend.test' };
    render();

    expect(page().querySelector('form')).not.toBeNull();
    expect(snackTexts()).toEqual([rejectedText]);
    expect(input('apiUrl')?.value).toBe('http://backend.test');
    expect(fixture.componentInstance.loginForm.value.clientId).toBe('client-a');
  });

  it('returns to the page after a rejection only when the same client signs in again', async () => {
    queryParams['returnUrl'] = '/settings/connection';
    render();
    rejectKeptCredentials();

    await submitForm('client-a', 'http://backend.test');
    expect(navigateByUrl).toHaveBeenLastCalledWith('/settings/connection');

    await submitForm('client-b', 'http://backend.test');
    expect(navigateByUrl).toHaveBeenLastCalledWith('/dashboard');
  });

  it('signs out of the kept session when the user wants other credentials', async () => {
    render();

    button('Sign out and use other credentials')?.click();
    fixture.detectChanges();

    expect(api.logout).toHaveBeenCalledOnce();
    expect(page().querySelector('form')).not.toBeNull();
    expect(snackTexts()).toEqual([]);
    await vi.waitFor(() => expect(document.activeElement).toBe(input('apiUrl')));
  });

  it('opens the dashboard after signing out of the kept session and signing in again', async () => {
    queryParams['returnUrl'] = '/settings/connection';
    render();
    button('Sign out and use other credentials')?.click();

    await submitForm('client-a', 'http://backend.test');

    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('stops waiting when the page is left', () => {
    render();

    fixture.destroy();
    api.tokenRenewed$.next();

    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('tries again on request and says when the backend still cannot be reached', async () => {
    let fail: (error: Error) => void = () => undefined;
    api.refreshAccessToken.mockReturnValue(new Promise((_, reject) => (fail = reject)));
    render();

    button('Try again now')?.click();
    fixture.detectChanges();
    expect(button('Try again now')?.disabled).toBe(true);

    fail(new TypeError('Failed to fetch'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.refreshAccessToken).toHaveBeenCalledTimes(2);
    expect(button('Try again now')?.disabled).toBe(false);
    expect(snackTexts()).toEqual(['The backend still cannot be reached. This page keeps trying.']);
  });

  it('names the status when the token request fails with an HTTP error', async () => {
    render();
    api.refreshAccessToken.mockRejectedValue(
      new OAuth2HttpError('HTTP Error 503', null as never, new Response(null, { status: 503 }), {})
    );

    button('Try again now')?.click();
    await fixture.whenStable();

    expect(snackTexts()).toEqual([
      'The token request failed with status 503. This page keeps trying.',
    ]);
  });

  it('reports only the rejection when trying again ends the session', async () => {
    render();
    api.refreshAccessToken.mockImplementation(() => {
      rejectKeptCredentials();
      return Promise.reject(new Error('OAuth2 error Unauthorized.'));
    });

    button('Try again now')?.click();
    await fixture.whenStable();

    expect(snackTexts()).toEqual([rejectedText]);
  });

  it('signs in with credentials from the URL instead of waiting for the kept session', async () => {
    Object.assign(queryParams, {
      clientId: 'client-b',
      clientSecret: 'secret-b',
      apiUrl: 'http://other.test',
    });
    render();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page().querySelector('[role="status"]')).toBeNull();
    expect(api.loginWithClientCredentials).toHaveBeenCalledWith(
      'client-b',
      'secret-b',
      'http://other.test',
      undefined
    );
    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('returns to the page from the link after signing in with the form', async () => {
    api.kept = false;
    queryParams['returnUrl'] = '/settings/connection';
    render();

    await submitForm('client-a', 'http://backend.test');

    expect(navigateByUrl).toHaveBeenCalledWith('/settings/connection');
  });
});
