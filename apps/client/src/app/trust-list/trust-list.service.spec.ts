import { TestBed } from '@angular/core/testing';
import { client } from '@eudiplo/sdk-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrustListService } from './trust-list.service';

describe('TrustListService', () => {
  /** Answers every request with `body` and records the requested paths. */
  function respondWith(body: unknown, status = 200): string[] {
    const paths: string[] = [];
    client.setConfig({
      fetch: async (request: RequestInfo | URL) => {
        paths.push(new URL(request instanceof Request ? request.url : String(request)).pathname);
        return new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });
    return paths;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
  });

  it('returns the trust lists of the tenant', async () => {
    const lists = [{ id: 'membership-issuers' }];
    const paths = respondWith(lists);

    await expect(TestBed.inject(TrustListService).getAll()).resolves.toEqual(lists);
    expect(paths).toEqual(['/api/trust-list']);
  });

  it('rejects with the backend error body, which the page turns into its message', async () => {
    const error = { statusCode: 404, message: 'Trust list membership-issuers not found' };
    respondWith(error, 404);

    await expect(TestBed.inject(TrustListService).getAll()).rejects.toEqual(error);
  });
});
