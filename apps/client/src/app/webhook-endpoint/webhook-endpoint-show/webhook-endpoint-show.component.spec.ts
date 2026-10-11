import { describe, expect, it, vi } from 'vitest';

import { WebhookEndpointShowComponent } from './webhook-endpoint-show.component';

describe('WebhookEndpointShowComponent', () => {
  it('says why the endpoint could not be loaded instead of a blank page, and retries', async () => {
    const getById = vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 404, message: 'Not found' })
      .mockResolvedValueOnce({ id: 'hook', name: 'Hook', url: 'https://a' });
    const component = new WebhookEndpointShowComponent(
      { getById } as never,
      { snapshot: { paramMap: { get: () => 'hook' } } } as never,
      { open: vi.fn() } as never,
      { navigate: vi.fn() } as never
    );

    component.ngOnInit();
    await vi.waitFor(() =>
      expect(component.loadError).toBe('Failed to load webhook endpoint: Not found')
    );

    component.load();
    await vi.waitFor(() => expect(component.endpoint?.id).toBe('hook'));
    expect(component.loadError).toBe('');
  });
});
