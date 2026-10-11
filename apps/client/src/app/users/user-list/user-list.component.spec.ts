import { client } from '@eudiplo/sdk-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UserListComponent } from './user-list.component';

describe('UserListComponent', () => {
  afterEach(() => {
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
  });

  it('says why the users could not be loaded instead of an empty list', async () => {
    client.setConfig({
      fetch: vi.fn<typeof fetch>(
        async () =>
          new Response(JSON.stringify({ statusCode: 500, message: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
      ),
    });
    const component = new UserListComponent(
      { open: vi.fn() } as never,
      {
        getRoles: () => ['users:manage'],
      } as never
    );

    await component.loadUsers();

    expect(component.isUnavailable).toBe(false);
    expect(component.loadError).toBe('Failed to load users: Internal server error');
  });
});
