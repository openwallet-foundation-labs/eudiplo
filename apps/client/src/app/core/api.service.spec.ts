import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService, defaultApiUrl } from './api.service';
import { OidcService } from './oidc.service';

/** Replaces `localStorage` with an in-memory store the test can inspect. */
function stubLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  });
  return store;
}

describe('defaultApiUrl', () => {
  it('prefers the runtime API_BASE_URL over the build-time default', () => {
    expect(defaultApiUrl('https://eudiplo.example.com', 'https://your-api-prod.com')).toBe(
      'https://eudiplo.example.com'
    );
  });

  it('falls back to the build-time default without a runtime value', () => {
    expect(defaultApiUrl(undefined, 'https://your-api-prod.com')).toBe('https://your-api-prod.com');
  });

  it('falls back to localhost when nothing is configured', () => {
    expect(defaultApiUrl()).toBe('http://localhost:3000');
  });
});

describe('ApiService.syncWithOidcSession', () => {
  const oidcStub: { mode: 'local' | 'oidc'; apiUrl?: string } = { mode: 'local' };

  beforeEach(() => {
    stubLocalStorage();
    oidcStub.mode = 'local';
    oidcStub.apiUrl = undefined;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: OidcService, useValue: oidcStub }],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('points the client at the backend of a restored OIDC session', () => {
    const service = TestBed.inject(ApiService);
    oidcStub.mode = 'oidc';
    oidcStub.apiUrl = 'https://eudiplo.example.com';

    service.syncWithOidcSession();

    expect(service.getBaseUrl()).toBe('https://eudiplo.example.com');
  });

  it('keeps the current base URL when no OIDC session was restored', () => {
    const service = TestBed.inject(ApiService);
    const before = service.getBaseUrl();
    oidcStub.apiUrl = 'https://eudiplo.example.com';

    service.syncWithOidcSession();

    expect(service.getBaseUrl()).toBe(before);
  });
});

describe('ApiService token refresh', () => {
  const backend = 'http://backend.test';
  const tokenEndpoint = `${backend}/api/oauth2/token`;
  /** Differs from the fallback built from the base URL, so tests see which one is used. */
  const storedTokenEndpoint = 'http://auth.test/token';
  const oidcStub = { mode: 'local' as const };
  const fetchMock = vi.fn<typeof fetch>();
  let store: Map<string, string>;

  /** A token response; tokens live 60 minutes, so the refresh runs after 55. */
  const tokenResponse = (accessToken: string) =>
    new Response(
      JSON.stringify({ access_token: accessToken, token_type: 'Bearer', expires_in: 3600 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  const oauthError = (status: number, error: string) => jsonError(status, { error });
  const jsonError = (status: number, body: object) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  /** What EUDIPLO's token endpoint answers for unknown or deleted clients and wrong secrets. */
  const backendRejection = () =>
    jsonError(401, {
      statusCode: 401,
      message: 'Invalid client credentials',
      error: 'Unauthorized',
    });
  /** Answers every request with a fresh response; a response body can be read only once. */
  const answerAlways = (response: () => Response) =>
    fetchMock.mockImplementation(() => Promise.resolve(response()));
  const runScheduledRefresh = () => vi.advanceTimersByTimeAsync(55 * 60_000);
  const reload = () =>
    new ApiService(TestBed.inject(HttpClient), oidcStub as unknown as OidcService);
  const requestedUrls = () => fetchMock.mock.calls.map(([url]) => String(url));
  const requestedClientIds = () =>
    fetchMock.mock.calls.map(
      ([, init]) =>
        atob(String(new Headers(init?.headers).get('Authorization')).slice('Basic '.length)).split(
          ':'
        )[0]
    );

  function storeSession(expiresInMs: number): void {
    store.set('access_token', 'stored');
    store.set('token_expiration', String(Date.now() + expiresInMs));
    store.set(
      'oauth_config',
      JSON.stringify({
        server: backend,
        clientId: 'client',
        baseUrl: backend,
        tokenEndpoint: storedTokenEndpoint,
      })
    );
    store.set('oauth_client_secret', 'secret');
  }

  async function signIn(): Promise<ApiService> {
    const service = TestBed.inject(ApiService);
    fetchMock.mockResolvedValueOnce(tokenResponse('first'));
    await service.loginWithClientCredentials('client', 'secret', backend, backend, tokenEndpoint);
    await service.refreshAccessToken();
    return service;
  }

  /** Holds the next token request until the test resolves it. */
  function holdNextRequest(): (response: Response) => void {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (resolve = r)));
    return (response) => resolve(response);
  }

  beforeEach(() => {
    store = stubLocalStorage();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
    for (const level of ['log', 'warn', 'error'] as const) {
      vi.spyOn(console, level).mockImplementation(() => undefined);
    }
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: OidcService, useValue: oidcStub }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps the session when the backend cannot be reached and saves the token once it is back', async () => {
    const service = await signIn();

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await runScheduledRefresh();

    // The current token is valid for five more minutes and the settings stay stored.
    expect(service.getAuthenticationStatus()).toBe(true);
    expect(service.isReconnecting()).toBe(true);
    expect(store.get('access_token')).toBe('first');
    expect(store.has('oauth_config')).toBe(true);
    expect(store.get('oauth_client_secret')).toBe('secret');

    fetchMock.mockResolvedValueOnce(tokenResponse('second'));
    await vi.advanceTimersByTimeAsync(5_000);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(service.isReconnecting()).toBe(false);
    expect(store.get('access_token')).toBe('second');
    const reloaded = reload();
    expect(reloaded.getAuthenticationStatus()).toBe(true);
    expect(reloaded.accessToken).toBe('second');
  });

  it('retries with a growing delay through server errors and resumes after the token expired', async () => {
    const service = await signIn();

    answerAlways(() => oauthError(503, 'temporarily_unavailable'));
    await runScheduledRefresh();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(9_999);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    // Past the token's expiry the session is no longer usable, but it is not forgotten.
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(service.getAuthenticationStatus()).toBe(false);
    expect(service.isReconnecting()).toBe(true);
    expect(store.has('oauth_config')).toBe(true);
    expect(store.get('oauth_client_secret')).toBe('secret');

    answerAlways(() => tokenResponse('second'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(service.getAuthenticationStatus()).toBe(true);
    expect(store.get('access_token')).toBe('second');
  });

  it.each([403, 404])(
    'keeps the session when the token endpoint answers %i, as a proxy may while the backend restarts',
    async (status) => {
      const service = await signIn();

      fetchMock.mockResolvedValueOnce(new Response('Unavailable', { status }));
      await runScheduledRefresh();

      expect(service.isReconnecting()).toBe(true);
      expect(store.get('oauth_client_secret')).toBe('secret');
      fetchMock.mockResolvedValueOnce(tokenResponse('second'));
      await vi.advanceTimersByTimeAsync(5_000);
      expect(store.get('access_token')).toBe('second');
    }
  );

  it('renews through ensureAuthenticated, as SDK calls do, once the backend is back', async () => {
    const service = await signIn();
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    expect(service.getAuthenticationStatus()).toBe(false);

    await expect(service.ensureAuthenticated()).resolves.toBe(false);
    expect(store.has('oauth_config')).toBe(true);

    answerAlways(() => tokenResponse('second'));
    await expect(service.ensureAuthenticated()).resolves.toBe(true);
    expect(store.get('access_token')).toBe('second');
  });

  it.each([
    ['400 invalid_client', () => oauthError(400, 'invalid_client')],
    ["EUDIPLO's 401", backendRejection],
  ])(
    'ends the session and stops sending the credentials when the token endpoint answers %s',
    async (_, rejection) => {
      const service = await signIn();

      fetchMock.mockResolvedValueOnce(rejection());
      await runScheduledRefresh();

      expect(service.getAuthenticationStatus()).toBe(false);
      expect(service.isReconnecting()).toBe(false);
      expect(service.canRefreshToken()).toBe(false);
      expect([...store.keys()]).toEqual([]);
      // The token stays usable until it expires, and the menu still names the client.
      expect(service.accessToken).toBe('first');
      expect(service.getClientId()).toBe('client');
      await expect(service.ensureAuthenticated()).resolves.toBe(false);
      await vi.advanceTimersByTimeAsync(10 * 60_000);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(reload().getAuthenticationStatus()).toBe(false);
    }
  );

  it('ends a restored session without a stored secret instead of retrying', async () => {
    storeSession(10 * 60_000);
    store.delete('oauth_client_secret');
    const service = TestBed.inject(ApiService);

    await expect(service.refreshAccessToken()).rejects.toThrow('not properly configured');

    expect(service.isReconnecting()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not keep or retry credentials whose first token request fails', async () => {
    const service = TestBed.inject(ApiService);
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await service.loginWithClientCredentials('client', 'secret', backend, backend, tokenEndpoint);

    await expect(service.refreshAccessToken()).rejects.toThrow('Failed to fetch');

    expect([...store.keys()]).toEqual([]);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('keeps a stored session whose token expired while the backend is down', async () => {
    storeSession(-1_000);
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const service = TestBed.inject(ApiService);
    await vi.advanceTimersByTimeAsync(0);

    expect(service.getAuthenticationStatus()).toBe(false);
    expect(store.has('oauth_config')).toBe(true);
    expect(store.get('oauth_client_secret')).toBe('secret');

    fetchMock.mockResolvedValueOnce(tokenResponse('second'));
    await vi.advanceTimersByTimeAsync(5_000);

    expect(service.getAuthenticationStatus()).toBe(true);
    expect(store.get('access_token')).toBe('second');
    expect(requestedUrls()).toEqual([storedTokenEndpoint, storedTokenEndpoint]);
  });

  it('forgets a stored session whose credentials are rejected on reload', async () => {
    storeSession(-1_000);
    fetchMock.mockResolvedValueOnce(oauthError(401, 'invalid_client'));

    const service = TestBed.inject(ApiService);
    await vi.advanceTimersByTimeAsync(10 * 60_000);

    expect(service.getAuthenticationStatus()).toBe(false);
    expect([...store.keys()]).toEqual([]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('refreshes settings stored without a token endpoint at the backend default', async () => {
    storeSession(-1_000);
    store.set(
      'oauth_config',
      JSON.stringify({ server: backend, clientId: 'client', baseUrl: backend })
    );
    fetchMock.mockResolvedValueOnce(tokenResponse('second'));

    const service = TestBed.inject(ApiService);
    await vi.advanceTimersByTimeAsync(0);

    expect(requestedUrls()).toEqual([tokenEndpoint]);
    expect(service.accessToken).toBe('second');
  });

  it('refreshes a restored session at the stored token endpoint, so a failed refresh can be retried', async () => {
    // A ten-minute token is refreshed with a quarter of its lifetime left.
    storeSession(10 * 60_000);
    const service = TestBed.inject(ApiService);
    expect(service.getAuthenticationStatus()).toBe(true);

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await vi.advanceTimersByTimeAsync(7.5 * 60_000);
    fetchMock.mockResolvedValueOnce(tokenResponse('second'));
    await vi.advanceTimersByTimeAsync(5_000);

    expect(requestedUrls()).toEqual([storedTokenEndpoint, storedTokenEndpoint]);
    expect(service.accessToken).toBe('second');
    expect(store.get('access_token')).toBe('second');
  });

  it('signs in with new credentials while a refresh for the previous ones is still pending', async () => {
    storeSession(-1_000);
    const answerPrevious = holdNextRequest();
    const service = TestBed.inject(ApiService);
    await vi.advanceTimersByTimeAsync(0);

    fetchMock.mockResolvedValueOnce(tokenResponse('other'));
    await service.loginWithClientCredentials(
      'other',
      'other-secret',
      backend,
      backend,
      tokenEndpoint
    );
    const login = service.refreshAccessToken();
    await vi.advanceTimersByTimeAsync(0);
    // The previous credentials' answer arrives last.
    answerPrevious(tokenResponse('previous'));
    await login;
    await vi.advanceTimersByTimeAsync(0);

    expect(requestedClientIds()).toEqual(['client', 'other']);
    expect(service.accessToken).toBe('other');
    expect(store.get('access_token')).toBe('other');
    expect(JSON.parse(store.get('oauth_config') ?? '{}').clientId).toBe('other');
  });

  it('keeps a new sign-in when the previous credentials are rejected afterwards', async () => {
    storeSession(-1_000);
    const answerPrevious = holdNextRequest();
    const service = TestBed.inject(ApiService);
    await vi.advanceTimersByTimeAsync(0);

    fetchMock.mockResolvedValueOnce(tokenResponse('other'));
    await service.loginWithClientCredentials(
      'other',
      'other-secret',
      backend,
      backend,
      tokenEndpoint
    );
    await service.refreshAccessToken();
    answerPrevious(backendRejection());
    await vi.advanceTimersByTimeAsync(0);

    expect(service.accessToken).toBe('other');
    expect(service.getAuthenticationStatus()).toBe(true);
    expect(store.get('oauth_client_secret')).toBe('other-secret');
    expect(JSON.parse(store.get('oauth_config') ?? '{}').clientId).toBe('other');
  });

  it('stays logged out when a refresh finishes after logout', async () => {
    const service = await signIn();
    const answerPending = holdNextRequest();
    const pending = service.refreshAccessToken();
    await vi.advanceTimersByTimeAsync(0);

    service.logout();
    answerPending(tokenResponse('late'));
    await pending;

    expect(service.getAuthenticationStatus()).toBe(false);
    expect(service.accessToken).toBe('');
    expect([...store.keys()]).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
