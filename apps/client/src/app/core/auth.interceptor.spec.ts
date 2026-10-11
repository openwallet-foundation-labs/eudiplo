import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRefusalService } from './api-refusal.service';
import { ApiService } from './api.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  const api = { accessToken: 'token-1', getBaseUrl: () => 'http://backend.test' };
  const refusals = { handleApiResponse: vi.fn() };
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    api.accessToken = 'token-1';
    refusals.handleApiResponse.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: api },
        { provide: ApiRefusalService, useValue: refusals },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  /** Sends a GET to `url`, lets `beforeAnswer` run, then answers with `status`. */
  async function answer(
    url: string,
    status: number,
    beforeAnswer = () => {}
  ): Promise<string | null> {
    const response = firstValueFrom(http.get(url)).catch(() => undefined);
    const request = controller.expectOne(url);
    beforeAnswer();
    request.flush(null, { status, statusText: 'Refused' });
    await response;
    return request.request.headers.get('Authorization');
  }

  it('sends the token and reports refusals of the management API', async () => {
    const authorization = await answer('http://backend.test/api/registrar/config', 401);

    expect(authorization).toBe('Bearer token-1');
    expect(refusals.handleApiResponse).toHaveBeenCalledWith(401, 'token-1');
  });

  it('reports the token the request was sent with, not one renewed meanwhile', async () => {
    await answer('http://backend.test/api/registrar/config', 401, () => {
      api.accessToken = 'token-2';
    });

    expect(refusals.handleApiResponse).toHaveBeenCalledWith(401, 'token-1');
  });

  it('does not report answers of other addresses', async () => {
    await answer('http://backend.test/.well-known/oauth-authorization-server', 401);
    await answer('https://elsewhere.test/api/x', 403);

    expect(refusals.handleApiResponse).not.toHaveBeenCalled();
  });
});
