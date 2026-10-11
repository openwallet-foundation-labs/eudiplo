import { describe, expect, it, vi } from 'vitest';

import { WebhookEndpointCreateComponent } from './webhook-endpoint-create.component';

describe('WebhookEndpointCreateComponent save', () => {
  it('shows rejected fields under the field and sends a double click once', async () => {
    const create = vi.fn().mockRejectedValue({
      statusCode: 400,
      message: 'Validation failed',
      errors: [
        { path: ['url'], message: 'Must be an https URL' },
        { path: ['auth', 'config', 'headerName'], message: 'Invalid header name' },
      ],
    });
    const snackBar = { open: vi.fn() };
    const component = new WebhookEndpointCreateComponent(
      { create } as never,
      { navigate: vi.fn() } as never,
      { snapshot: { paramMap: { get: () => null } } } as never,
      snackBar as never,
      {} as never
    );
    component.form.patchValue({
      id: 'example',
      name: 'Example',
      url: 'http://example.com',
      authType: 'apiKey',
      authHeaderName: 'X Key',
      authHeaderValue: 'secret',
    });

    component.onSubmit();
    component.onSubmit();
    await vi.waitFor(() => expect(component.saving).toBe(false));

    expect(create).toHaveBeenCalledOnce();
    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to create webhook endpoint. Check the highlighted fields.'
    );
    expect(component.fieldError('url', 'URL is required')).toBe('Must be an https URL');
    expect(component.fieldError('authHeaderName')).toBe('Invalid header name');
  });

  it('shows rejected fields when an update is rejected', async () => {
    const update = vi.fn().mockRejectedValue({
      statusCode: 400,
      message: 'Validation failed',
      errors: [{ path: ['url'], message: 'Must be an https URL' }],
    });
    const component = new WebhookEndpointCreateComponent(
      {
        update,
        getById: vi.fn().mockResolvedValue({ id: 'example', name: 'Example', url: 'https://a' }),
      } as never,
      { navigate: vi.fn() } as never,
      { snapshot: { paramMap: { get: () => 'example' } } } as never,
      { open: vi.fn() } as never,
      {} as never
    );
    component.ngOnInit();
    await vi.waitFor(() => expect(component.loading).toBe(false));
    component.form.patchValue({ url: 'http://example.com' });

    component.onSubmit();
    await vi.waitFor(() => expect(update).toHaveBeenCalled());
    await vi.waitFor(() => expect(component.saving).toBe(false));

    expect(component.fieldError('url', 'URL is required')).toBe('Must be an https URL');
  });

  it('lets Save go again when a rejected header field is hidden by choosing no auth', () => {
    const component = new WebhookEndpointCreateComponent(
      {} as never,
      { navigate: vi.fn() } as never,
      { snapshot: { paramMap: { get: () => null } } } as never,
      { open: vi.fn() } as never,
      {} as never
    );
    component.form.patchValue({
      id: 'example',
      name: 'Example',
      url: 'https://a',
      authType: 'apiKey',
    });
    component.form.get('authHeaderName')?.setErrors({ server: 'Invalid header name' });
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ authType: 'none' });

    expect(component.form.valid).toBe(true);
  });

  it('does not save while the webhook endpoint to edit loads, nor after its load failed', async () => {
    const update = vi.fn();
    const component = new WebhookEndpointCreateComponent(
      {
        update,
        getById: vi.fn().mockRejectedValue({ statusCode: 404, message: 'Not found' }),
      } as never,
      { navigate: vi.fn() } as never,
      { snapshot: { paramMap: { get: () => 'example' } } } as never,
      { open: vi.fn() } as never,
      {} as never
    );

    component.ngOnInit();
    // A filled, valid form must still not be sent over the stored one.
    component.form.patchValue({ id: 'example', name: 'Example', url: 'https://a' });
    expect(component.form.valid).toBe(true);
    component.onSubmit();
    await vi.waitFor(() => expect(component.loading).toBe(false));
    component.onSubmit();

    expect(component.loadError).toBe('Failed to load webhook endpoint: Not found');
    expect(update).not.toHaveBeenCalled();
  });
});
