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

  it('saves the export of the trust list as a JSON file named after it', async () => {
    const config = { id: 'membership-issuers', entities: [] };
    const paths = respondWith(config);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    // jsdom has no object URLs; keep the file handed to the browser.
    const { createObjectURL, revokeObjectURL } = URL;
    const files: Blob[] = [];
    URL.createObjectURL = (blob: Blob) => (files.push(blob), 'blob:trust-list');
    URL.revokeObjectURL = () => undefined;

    try {
      await TestBed.inject(TrustListService).downloadConfig('membership-issuers');
    } finally {
      Object.assign(URL, { createObjectURL, revokeObjectURL });
    }

    expect(paths).toEqual(['/api/trust-list/membership-issuers/export']);
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(
      'trustlist-membership-issuers-config.json'
    );
    expect(files).toHaveLength(1);
    expect(JSON.parse(await files[0].text())).toEqual(config);
  });

  it('rejects with the backend error body, which the page turns into its message', async () => {
    const error = { statusCode: 404, message: 'Trust list membership-issuers not found' };
    respondWith(error, 404);
    const service = TestBed.inject(TrustListService);

    await expect(service.downloadConfig('membership-issuers')).rejects.toEqual(error);
    await expect(service.getAll()).rejects.toEqual(error);
  });
});
