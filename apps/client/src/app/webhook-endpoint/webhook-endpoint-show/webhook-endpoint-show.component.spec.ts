import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { renderDownloadButton } from '../../config-portability/config-document.testing';
import { WebhookEndpointService } from '../webhook-endpoint.service';
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
      { navigate: vi.fn() } as never,
      {} as never
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

describe('WebhookEndpointShowComponent download', () => {
  it('downloads the configuration document', async () => {
    const downloadWithFeedback = vi.fn().mockResolvedValue(undefined);
    const component = new WebhookEndpointShowComponent(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { downloadWithFeedback } as never
    );
    component.endpoint = { id: 'hook' } as never;

    await component.downloadConfig();

    expect(downloadWithFeedback).toHaveBeenCalledWith('WebhookEndpoint', 'hook');
  });
});

describe('WebhookEndpointShowComponent download button', () => {
  function render(canDownload: boolean, downloadingId = 'hook') {
    return renderDownloadButton(WebhookEndpointShowComponent, {
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'hook' }) } },
        },
        {
          provide: WebhookEndpointService,
          useValue: {
            getById: async () => ({ id: 'hook', name: 'Hook', url: 'https://hooks.example.com' }),
          },
        },
      ],
      loaded: (component) => !!component.endpoint,
      downloading: ['WebhookEndpoint', downloadingId],
      canDownload,
    });
  }

  it('is hidden without a role that may download the document', async () => {
    expect(await render(false)).toBeNull();
  });

  it('is disabled while the document is being downloaded', async () => {
    const button = await render(true);

    expect(button?.getAttribute('aria-disabled')).toBe('true');
    expect(button?.getAttribute('aria-busy')).toBe('true');
  });

  it('stays enabled while another endpoint is being downloaded', async () => {
    const button = await render(true, 'other');

    expect(button).not.toBeNull();
    expect(button?.getAttribute('aria-disabled')).not.toBe('true');
    expect(button?.getAttribute('aria-busy')).toBe('false');
  });
});
