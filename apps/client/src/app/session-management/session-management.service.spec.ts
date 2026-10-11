import { client } from '@eudiplo/sdk-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionManagementService } from './session-management.service';

describe('SessionManagementService', () => {
  const forbidden = { statusCode: 403, message: 'Forbidden resource' };

  beforeEach(() => {
    client.setConfig({
      fetch: vi.fn<typeof fetch>(
        async () =>
          new Response(JSON.stringify(forbidden), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          })
      ),
    });
  });

  afterEach(() => {
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
  });

  it("passes the backend's error on, so the list can show its reason", async () => {
    const service = new SessionManagementService();

    await expect(service.getAllSessions()).rejects.toMatchObject(forbidden);
    await expect(service.deleteSession('s-1')).rejects.toMatchObject(forbidden);
  });
});
