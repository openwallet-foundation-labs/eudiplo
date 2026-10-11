import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { client } from '@eudiplo/sdk-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigOwnershipService } from '../config-portability/config-ownership.service';
import { StatusListConfigComponent } from './status-list-config.component';

/** A response, or `'unreachable'` for a backend that does not answer. */
type StubResponse = { status: number; body?: unknown } | 'unreachable';

const unreachableHint = 'the backend could not be reached. Check the connection and try again.';

/** Rendering through the real SDK can take longer than 1 s when the whole suite runs. */
const waitOptions = { timeout: 5000 };

describe('StatusListConfigComponent', () => {
  let responses: Record<string, StubResponse>;
  let requests: string[];
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<StatusListConfigComponent>;

  async function render(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(StatusListConfigComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.isLoading).toBe(false), waitOptions);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function button(element: HTMLElement, label: string): HTMLButtonElement {
    const found = [...element.querySelectorAll('button')].find((b) =>
      b.textContent?.includes(label)
    );
    if (!found) throw new Error(`No button "${label}"`);
    return found;
  }

  /** Clicks a button and waits for the snackbar that reports the outcome. */
  async function clickAndWait(element: HTMLElement, label: string): Promise<void> {
    snackBar.open.mockClear();
    button(element, label).click();
    await vi.waitFor(() => expect(snackBar.open).toHaveBeenCalled(), waitOptions);
  }

  beforeEach(async () => {
    responses = { 'GET /api/status-list-config': { status: 200, body: {} } };
    requests = [];
    snackBar = { open: vi.fn() };
    client.setConfig({
      fetch: vi.fn<typeof fetch>(async (input) => {
        const request = input as Request;
        const key = `${request.method} ${new URL(request.url).pathname}`;
        requests.push(key);
        const stub = responses[key] ?? { status: 404, body: {} };
        if (stub === 'unreachable') throw new TypeError('Failed to fetch');
        return new Response(stub.status === 204 ? null : JSON.stringify(stub.body ?? {}), {
          status: stub.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    });
    await TestBed.configureTestingModule({
      imports: [StatusListConfigComponent],
      providers: [
        {
          provide: ConfigOwnershipService,
          useValue: { get: async () => undefined, isManaged: async () => false },
        },
      ],
    })
      // The component imports MatSnackBarModule, whose provider wins over a root provider.
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .compileComponents();
  });

  afterEach(() => {
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
    vi.unstubAllGlobals();
  });

  const stored = { capacity: 50000, bits: 2, ttl: 7200, immediateUpdate: false };
  const conflict = {
    statusCode: 409,
    error: 'Conflict',
    message:
      "Tenant 'tenant' is file-managed by provisioning. Detach it before changing it through the API or UI.",
  };

  it('shows the backend message when saving is rejected', async () => {
    responses['PUT /api/status-list-config'] = { status: 409, body: conflict };
    const element = await render();

    await clickAndWait(element, 'Save Configuration');

    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      "Failed to save configuration: Tenant 'tenant' is file-managed by provisioning. Detach it before changing it through the API or UI."
    );
  });

  it('says when the backend cannot be reached on save and on reset', async () => {
    vi.stubGlobal('confirm', () => true);
    responses['GET /api/status-list-config'] = { status: 200, body: { capacity: 10000 } };
    responses['PUT /api/status-list-config'] = 'unreachable';
    responses['DELETE /api/status-list-config'] = 'unreachable';
    const element = await render();

    await clickAndWait(element, 'Save Configuration');
    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      `Failed to save configuration: ${unreachableHint}`
    );
    await clickAndWait(element, 'Reset to Defaults');
    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      `Failed to reset configuration: ${unreachableHint}`
    );
  });

  it('names the field the backend rejected on save', async () => {
    responses['PUT /api/status-list-config'] = {
      status: 400,
      body: {
        statusCode: 400,
        message: 'Validation failed',
        errors: [{ path: ['capacity'], message: 'Too big', code: 'too_big' }],
      },
    };
    const element = await render();

    await clickAndWait(element, 'Save Configuration');

    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to save configuration: Validation failed (capacity: Too big)'
    );
  });

  it('says when the backend cannot be reached while loading', async () => {
    responses['GET /api/status-list-config'] = 'unreachable';

    const element = await render();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      `Failed to load status list configuration: ${unreachableHint}`
    );
  });

  it('shows an error with a retry instead of an editable form when loading fails', async () => {
    responses['GET /api/status-list-config'] = {
      status: 403,
      body: { statusCode: 403, message: 'Forbidden resource' },
    };

    const element = await render();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Failed to load status list configuration: Forbidden resource'
    );
    expect(element.querySelector('form')).toBeNull();
    expect(element.textContent).not.toContain('Save Configuration');
    await fixture.componentInstance.onSave();
    await fixture.componentInstance.onReset();
    expect(requests).toEqual(['GET /api/status-list-config']);

    responses['GET /api/status-list-config'] = { status: 200, body: stored };
    button(element, 'Retry').click();
    await vi.waitFor(() => expect(fixture.componentInstance.loadError).toBe(''), waitOptions);
    await vi.waitFor(() => expect(fixture.componentInstance.isLoading).toBe(false), waitOptions);
    fixture.detectChanges();

    expect(element.querySelector('form')).not.toBeNull();
    expect(fixture.componentInstance.configForm.value.capacity).toBe(50000);
  });

  it('offers no reset while the tenant follows the global defaults', async () => {
    const element = await render();

    expect(button(element, 'Reset to Defaults').disabled).toBe(true);
    expect(element.textContent).toContain('This tenant already follows the global defaults.');
  });

  it('resets only after a confirmation that names the stored settings', async () => {
    const confirm = vi.fn<(message?: string) => boolean>(() => false);
    vi.stubGlobal('confirm', confirm);
    responses['GET /api/status-list-config'] = { status: 200, body: stored };
    responses['DELETE /api/status-list-config'] = { status: 409, body: conflict };
    const element = await render();

    // The confirmation comes before any request, so it has run when click() returns.
    button(element, 'Reset to Defaults').click();

    expect(confirm.mock.calls[0][0]).toContain(
      'This removes the capacity, the bits per entry, the TTL and the update mode stored for this tenant.'
    );
    expect(requests).not.toContain('DELETE /api/status-list-config');

    confirm.mockReturnValue(true);
    await clickAndWait(element, 'Reset to Defaults');

    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      "Failed to reset configuration: Tenant 'tenant' is file-managed by provisioning. Detach it before changing it through the API or UI."
    );
  });

  it('names a single stored setting in the reset confirmation', async () => {
    const confirm = vi.fn<(message?: string) => boolean>(() => false);
    vi.stubGlobal('confirm', confirm);
    responses['GET /api/status-list-config'] = { status: 200, body: { ttl: 7200 } };
    const element = await render();

    button(element, 'Reset to Defaults').click();

    expect(confirm.mock.calls[0][0]).toContain('This removes the TTL stored for this tenant.');
  });
});
