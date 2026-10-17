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
      { navigate: vi.fn() } as never,
      {} as never
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

describe('AttributeProviderShowComponent download', () => {
  function create(download: ReturnType<typeof vi.fn>) {
    const snackBar = { open: vi.fn() };
    const configDocuments = { download, canDownload: () => true };
    const component = new AttributeProviderShowComponent(
      {} as never,
      {} as never,
      snackBar as never,
      {} as never,
      configDocuments as never
    );
    component.provider = { id: 'registry' } as never;
    return { component, snackBar };
  }

  it('downloads the configuration document', async () => {
    const download = vi.fn().mockResolvedValue('Configuration downloaded');
    const { component, snackBar } = create(download);

    await component.downloadConfig();

    expect(download).toHaveBeenCalledWith('AttributeProvider', 'registry');
    expect(snackBar.open.mock.lastCall?.[0]).toBe('Configuration downloaded');
  });

  it("shows the backend's reason when the download fails", async () => {
    const download = vi.fn().mockRejectedValue({ statusCode: 403, message: 'Forbidden resource' });
    const { component, snackBar } = create(download);

    await component.downloadConfig();

    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to download configuration: Forbidden resource'
    );
  });
});
