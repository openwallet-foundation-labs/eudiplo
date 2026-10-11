import { HttpErrorResponse } from '@angular/common/http';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Session } from '@eudiplo/sdk-core';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionManagementShowComponent } from './session-management-show.component';

describe('SessionManagementShowComponent', () => {
  let component: SessionManagementShowComponent;
  let fixture: ComponentFixture<SessionManagementShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionManagementShowComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionManagementShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('SessionManagementShowComponent errors', () => {
  const base64url = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const requestObject = `${base64url({ alg: 'ES256' })}.${base64url({
    response_uri: 'http://localhost/response',
  })}.signature`;

  let sessionService: {
    cancelSession: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
  };
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let httpClient: { post: ReturnType<typeof vi.fn> };
  let credentialsGet: ReturnType<typeof vi.fn>;

  function create(session: Partial<Session>): SessionManagementShowComponent {
    const component = new SessionManagementShowComponent(
      sessionService as never,
      {} as never,
      snackBar as never,
      { navigate: vi.fn() } as never,
      httpClient as never,
      {} as never,
      { open: () => ({ afterClosed: () => of({ reason: 'test' }) }) } as never,
      {} as never
    );
    component.session = { id: 'session', status: 'active', ...session } as Session;
    return component;
  }

  beforeEach(() => {
    sessionService = {
      cancelSession: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ id: 'session', status: 'active' }),
    };
    snackBar = { open: vi.fn() };
    httpClient = { post: vi.fn() };
    credentialsGet = vi.fn();
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: { get: credentialsGet },
    });
    vi.stubGlobal('DigitalCredential', class {});
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'credentials');
    vi.unstubAllGlobals();
  });

  it("shows the backend's reason when cancelling fails for another reason than a conflict", async () => {
    sessionService.cancelSession.mockRejectedValue({
      statusCode: 404,
      message: 'Session not found',
    });

    create({}).cancelSession();

    await vi.waitFor(() =>
      expect(snackBar.open).toHaveBeenCalledWith(
        'The session could not be cancelled: Session not found',
        'Close',
        expect.anything()
      )
    );
  });

  it('keeps the conflict text for a 409 and names the failure when the error says nothing', async () => {
    sessionService.cancelSession
      .mockRejectedValueOnce({ statusCode: 409, message: 'Session is not pending' })
      .mockRejectedValueOnce({});

    create({}).cancelSession();
    await vi.waitFor(() =>
      expect(snackBar.open).toHaveBeenCalledWith(
        'The session could not be cancelled, it is no longer pending',
        'Close',
        expect.anything()
      )
    );
    create({}).cancelSession();
    await vi.waitFor(() =>
      expect(snackBar.open).toHaveBeenCalledWith(
        'The session could not be cancelled',
        'Close',
        expect.anything()
      )
    );
  });

  it('does not take an error of the Digital Credentials API for a network failure', async () => {
    credentialsGet.mockRejectedValue(new TypeError('Malformed request'));

    await create({ requestObject }).getDcApiCall();

    expect(snackBar.open.mock.lastCall?.[0]).toBe('DC API error: Malformed request');
    expect(sessionService.getSession).not.toHaveBeenCalled();
  });

  it.each([
    [
      { statusCode: 400, timestamp: '2026-10-11T12:00:00.000Z', path: '/presentations/s/oid4vp' },
      'The verifier rejected the presentation; the session status shows why.',
    ],
    [
      {
        redirect_uri:
          'https://rp.example/done?error=invalid_request&error_description=Credential%20revoked',
      },
      'The verifier rejected the presentation: Credential revoked',
    ],
  ])(
    'says the verifier rejected the response with body %j and reloads the session',
    async (body, text) => {
      credentialsGet.mockResolvedValue({
        protocol: 'openid4vp-v1-signed',
        data: { response: 'x' },
      });
      httpClient.post.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 400, error: body }))
      );

      await create({ requestObject }).getDcApiCall();

      expect(snackBar.open).toHaveBeenCalledWith(text, 'Close', expect.anything());
      expect(sessionService.getSession).toHaveBeenCalledWith('session');
    }
  );

  it("shows the verifier's reason when it rejects the wallet's response", async () => {
    credentialsGet.mockResolvedValue({ protocol: 'openid4vp-v1-signed', data: { response: 'x' } });
    httpClient.post.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { statusCode: 400, message: 'Invalid presentation' },
          })
      )
    );

    await create({ requestObject }).getDcApiCall();

    expect(snackBar.open.mock.lastCall?.[0]).toBe('DC API error: Invalid presentation');
  });

  it("keeps the wallet's own error", async () => {
    credentialsGet.mockResolvedValue({
      data: { error: 'access_denied', error_description: 'User declined' },
    });

    await create({ requestObject }).getDcApiCall();

    expect(snackBar.open.mock.lastCall?.[0]).toBe('DC API error: access_denied: User declined');
    expect(httpClient.post).not.toHaveBeenCalled();
  });
});
