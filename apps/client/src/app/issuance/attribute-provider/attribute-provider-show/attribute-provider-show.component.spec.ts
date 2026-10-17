import { describe, expect, it, vi } from 'vitest';

import { AttributeProviderShowComponent } from './attribute-provider-show.component';
import { renderDownloadButton } from '../../../config-portability/config-document.testing';
import { AttributeProviderService } from '../attribute-provider.service';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

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
  it('downloads the configuration document', async () => {
    const downloadWithFeedback = vi.fn().mockResolvedValue(undefined);
    const component = new AttributeProviderShowComponent(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { downloadWithFeedback } as never
    );
    component.provider = { id: 'registry' } as never;

    await component.downloadConfig();

    expect(downloadWithFeedback).toHaveBeenCalledWith('AttributeProvider', 'registry');
  });

  it('disables the button while the document is being downloaded', async () => {
    const button = await renderDownloadButton(AttributeProviderShowComponent, {
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'registry' }) } },
        },
        {
          provide: AttributeProviderService,
          useValue: {
            getById: async () => ({
              id: 'registry',
              name: 'Registry',
              url: 'https://registry.example.com',
            }),
          },
        },
      ],
      loaded: (component) => !!component.provider,
      downloading: ['AttributeProvider', 'registry'],
    });

    expect(button?.getAttribute('aria-disabled')).toBe('true');
    expect(button?.getAttribute('aria-busy')).toBe('true');
  });

  it('stays enabled while another resource is being downloaded', async () => {
    const button = await renderDownloadButton(AttributeProviderShowComponent, {
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'registry' }) } },
        },
        {
          provide: AttributeProviderService,
          useValue: {
            getById: async () => ({
              id: 'registry',
              name: 'Registry',
              url: 'https://registry.example.com',
            }),
          },
        },
      ],
      loaded: (component) => !!component.provider,
      downloading: ['AttributeProvider', 'other'],
    });

    expect(button).not.toBeNull();
    expect(button?.getAttribute('aria-disabled')).not.toBe('true');
    expect(button?.getAttribute('aria-busy')).toBe('false');
  });
});
