import { describe, expect, it, vi } from 'vitest';

import { AttributeProviderShowComponent } from './attribute-provider-show.component';

describe('AttributeProviderShowComponent', () => {
  it('says why the provider could not be loaded instead of a blank page, and retries', async () => {
    const getById = vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 404, message: 'Not found' })
      .mockResolvedValueOnce({ id: 'registry', name: 'Registry', url: 'https://a' });
    const component = new AttributeProviderShowComponent(
      { getById } as never,
      { snapshot: { paramMap: { get: () => 'registry' } } } as never,
      { open: vi.fn() } as never,
      { navigate: vi.fn() } as never
    );

    component.ngOnInit();
    await vi.waitFor(() =>
      expect(component.loadError).toBe('Failed to load attribute provider: Not found')
    );

    component.load();
    await vi.waitFor(() => expect(component.provider?.id).toBe('registry'));
    expect(component.loadError).toBe('');
  });
});
