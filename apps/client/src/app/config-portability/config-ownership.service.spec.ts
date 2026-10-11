import { client } from '@eudiplo/sdk-core';
import { vi } from 'vitest';

import type { ApiService } from '../core';
import { ConfigOwnershipService } from './config-ownership.service';

describe('ConfigOwnershipService', () => {
  let requests: string[];
  let status: number;
  let service: ConfigOwnershipService;

  beforeEach(() => {
    requests = [];
    status = 200;
    client.setConfig({
      baseUrl: 'http://localhost:3000',
      fetch: vi.fn<typeof fetch>(async (input) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        requests.push(url.pathname);
        const kind = url.pathname.split('/').pop();
        const body =
          status !== 200
            ? { statusCode: status, message: 'Forbidden' }
            : kind === 'CredentialConfig'
              ? [{ kind, resourceId: 'pid', ownership: 'unmanaged', generation: 4 }]
              : [
                  {
                    kind: 'PresentationConfig',
                    resourceId: 'pid',
                    ownership: 'file-managed',
                    generation: 1,
                    source: 'folder:/config/demo',
                  },
                  {
                    kind: 'PresentationConfig',
                    resourceId: 'manual',
                    ownership: 'unmanaged',
                    generation: 2,
                  },
                ];
        return new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    });
    service = new ConfigOwnershipService({ client } as ApiService);
  });

  it('reads one kind with a single request for the lookups of a screen', async () => {
    const [notice, edit, remove] = await Promise.all([
      service.get('PresentationConfig', 'pid'),
      service.isManaged('PresentationConfig', 'pid'),
      service.isManaged('PresentationConfig', 'manual'),
    ]);

    expect(notice).toMatchObject({ ownership: 'file-managed', source: 'folder:/config/demo' });
    expect(edit).toBe(true);
    expect(remove).toBe(false);
    expect(requests).toEqual(['/api/config-bundles/resources/PresentationConfig']);
  });

  it('keeps kinds apart when they share a resource ID', async () => {
    const [presentation, credential] = await Promise.all([
      service.isManaged('PresentationConfig', 'pid'),
      service.isManaged('CredentialConfig', 'pid'),
    ]);

    expect(presentation).toBe(true);
    expect(credential).toBe(false);
    expect(requests.sort()).toEqual([
      '/api/config-bundles/resources/CredentialConfig',
      '/api/config-bundles/resources/PresentationConfig',
    ]);
  });

  it('asks again for a later screen', async () => {
    await service.isManaged('PresentationConfig', 'pid');
    await service.isManaged('PresentationConfig', 'pid');

    expect(requests).toHaveLength(2);
  });

  it('rejects a failed lookup and retries on the next one', async () => {
    status = 403;
    await expect(service.isManaged('PresentationConfig', 'pid')).rejects.toMatchObject({
      statusCode: 403,
    });

    status = 200;
    await expect(service.isManaged('PresentationConfig', 'pid')).resolves.toBe(true);
    expect(requests).toHaveLength(2);
  });
});
