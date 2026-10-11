import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { client } from '@eudiplo/sdk-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigOwnershipService } from '../config-portability/config-ownership.service';
import { StatusListConfigComponent } from './status-list-config.component';

/** A response, or `'unreachable'` for a backend that does not answer. */
type StubResponse = { status: number; body?: unknown } | 'unreachable';

describe('StatusListConfigComponent', () => {
  let responses: Record<string, StubResponse>;
  let requests: string[];
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<StatusListConfigComponent>;

  const unreachableHint = 'the backend could not be reached. Check the connection and try again.';

  async function render(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(StatusListConfigComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.isLoading).toBe(false));
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

  /** Clicks a button and returns the message of the snackbar that reports the outcome. */
  async function click(element: HTMLElement, label: string): Promise<string> {
    snackBar.open.mockClear();
    button(element, label).click();
    await vi.waitFor(() => expect(snackBar.open).toHaveBeenCalled());
    return snackBar.open.mock.calls[0][0] as string;
  }

  beforeEach(async () => {
    responses = { 'GET /api/status-list-config': { status: 200, body: { capacity: 10000 } } };
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
          useValue: { get: async () => undefined },
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

  it('shows an error with a retry instead of an editable form when loading fails', async () => {
    responses['GET /api/status-list-config'] = {
      status: 500,
      body: { statusCode: 500, message: 'Internal server error' },
    };

    const element = await render();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Failed to load status list configuration: Internal server error'
    );
    expect(element.querySelector('form')).toBeNull();
    expect(element.textContent).not.toContain('Save Configuration');
    expect(element.textContent).not.toContain('Reset to Defaults');
    expect(button(element, 'Retry')).toBeTruthy();
    // The defaults in the hidden form must not replace the stored settings.
    await fixture.componentInstance.onSave();
    expect(requests).not.toContain('PUT /api/status-list-config');
  });

  it('says when the backend cannot be reached while loading', async () => {
    responses['GET /api/status-list-config'] = 'unreachable';

    const element = await render();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      `Failed to load status list configuration: ${unreachableHint}`
    );
    expect(element.querySelector('form')).toBeNull();

    button(element, 'Retry').click();
    await vi.waitFor(() =>
      expect(requests.filter((r) => r === 'GET /api/status-list-config')).toHaveLength(2)
    );
    await vi.waitFor(() => expect(fixture.componentInstance.isLoading).toBe(false));
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(unreachableHint);
    expect(element.querySelector('form')).toBeNull();
    expect(button(element, 'Retry')).toBeTruthy();
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('shows the stored settings once a retry after a failed load succeeds', async () => {
    responses['GET /api/status-list-config'] = 'unreachable';
    const element = await render();

    responses['GET /api/status-list-config'] = {
      status: 200,
      body: { capacity: 50000, bits: 2, enableAggregation: false },
    };
    button(element, 'Retry').click();
    await vi.waitFor(() => expect(fixture.componentInstance.isLoading).toBe(false));
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.querySelector('form')).not.toBeNull();
    expect(fixture.componentInstance.configForm.value).toEqual({
      capacity: 50000,
      bits: 2,
      ttl: null,
      immediateUpdate: false,
      enableAggregation: false,
    });
    expect(button(element, 'Save Configuration').disabled).toBe(false);
  });

  it('offers no reset while nothing is stored', async () => {
    // The backend answers null, which the SDK reads as an empty object.
    responses['GET /api/status-list-config'] = { status: 200, body: {} };

    const element = await render();

    expect(button(element, 'Reset to Defaults').disabled).toBe(true);
    const confirm = vi.fn<(message?: string) => boolean>(() => true);
    vi.stubGlobal('confirm', confirm);
    await fixture.componentInstance.onReset();
    expect(confirm).not.toHaveBeenCalled();
    expect(requests).not.toContain('DELETE /api/status-list-config');
  });

  it('offers a reset once a save stores settings', async () => {
    responses['GET /api/status-list-config'] = { status: 200, body: {} };
    responses['PUT /api/status-list-config'] = {
      status: 200,
      body: { capacity: 1000, bits: 1, immediateUpdate: false, enableAggregation: true },
    };
    const element = await render();
    fixture.componentInstance.configForm.patchValue({ capacity: 1000 });
    fixture.detectChanges();

    expect(await click(element, 'Save Configuration')).toBe(
      'Status list configuration saved successfully'
    );
    fixture.detectChanges();

    expect(button(element, 'Reset to Defaults').disabled).toBe(false);
  });

  it('counts stored false values and 1 bit as settings to reset', async () => {
    const confirm = vi.fn<(message?: string) => boolean>(() => false);
    vi.stubGlobal('confirm', confirm);
    responses['GET /api/status-list-config'] = {
      status: 200,
      body: { bits: 1, immediateUpdate: false, enableAggregation: false },
    };
    const element = await render();

    expect(button(element, 'Reset to Defaults').disabled).toBe(false);
    button(element, 'Reset to Defaults').click();

    expect(confirm.mock.lastCall?.[0]).toContain(
      'This removes 1 bit per status, lazy JWT regeneration, and disabled aggregation. ' +
        'Afterwards, new status lists use STATUS_BITS; all status lists, ' +
        'including existing ones, use STATUS_IMMEDIATE_UPDATE and STATUS_ENABLE_AGGREGATION of ' +
        'this instance.'
    );
  });

  it('names only the instance variables that take over', async () => {
    const confirm = vi.fn<(message?: string) => boolean>(() => false);
    vi.stubGlobal('confirm', confirm);
    responses['GET /api/status-list-config'] = { status: 200, body: { ttl: 900 } };
    let element = await render();

    button(element, 'Reset to Defaults').click();
    expect(confirm.mock.lastCall?.[0]).toContain(
      'This removes the TTL of 15 minutes. Afterwards, all status lists, including existing ' +
        'ones, use STATUS_TTL of this instance.'
    );

    fixture.destroy();
    responses['GET /api/status-list-config'] = {
      status: 200,
      body: { capacity: 1000, bits: 2, enableAggregation: true },
    };
    element = await render();

    button(element, 'Reset to Defaults').click();
    expect(confirm.mock.lastCall?.[0]).toContain(
      `This removes the capacity of ${(1000).toLocaleString()} entries, 2 bits per status, and ` +
        'enabled aggregation. Afterwards, new status lists use STATUS_CAPACITY and STATUS_BITS; ' +
        'all status lists, including existing ones, use STATUS_ENABLE_AGGREGATION of this instance.'
    );
  });

  it('resets only after confirmation and then offers no further reset', async () => {
    const confirm = vi.fn<(message?: string) => boolean>(() => false);
    vi.stubGlobal('confirm', confirm);
    responses['GET /api/status-list-config'] = {
      status: 200,
      body: { capacity: 50000, ttl: 900, immediateUpdate: true },
    };
    responses['DELETE /api/status-list-config'] = { status: 204 };
    const element = await render();

    button(element, 'Reset to Defaults').click();
    expect(confirm.mock.lastCall?.[0]).toContain(
      `This removes the capacity of ${(50000).toLocaleString()} entries, the TTL of 15 minutes, ` +
        'and immediate JWT ' +
        'regeneration. Afterwards, new status lists use STATUS_CAPACITY; all ' +
        'status lists, including existing ones, use STATUS_TTL and STATUS_IMMEDIATE_UPDATE of ' +
        'this instance.'
    );
    expect(fixture.componentInstance.isSaving).toBe(false);
    // The SDK awaits before it calls fetch; let a cancelled reset run to completion.
    await new Promise((resolve) => setTimeout(resolve));
    expect(requests).not.toContain('DELETE /api/status-list-config');
    expect(snackBar.open).not.toHaveBeenCalled();
    expect(fixture.componentInstance.configForm.value.capacity).toBe(50000);

    confirm.mockReturnValue(true);
    expect(await click(element, 'Reset to Defaults')).toBe(
      'Status list configuration reset to defaults'
    );
    fixture.detectChanges();
    expect(requests).toContain('DELETE /api/status-list-config');
    expect(fixture.componentInstance.configForm.value).toEqual({
      capacity: null,
      bits: 1,
      ttl: null,
      immediateUpdate: false,
      enableAggregation: true,
    });
    expect(button(element, 'Reset to Defaults').disabled).toBe(true);
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

    expect(await click(element, 'Save Configuration')).toBe(
      'Failed to save configuration: Validation failed (capacity: Too big)'
    );
  });

  it('says when the backend cannot be reached on save and on reset', async () => {
    vi.stubGlobal('confirm', () => true);
    responses['PUT /api/status-list-config'] = 'unreachable';
    responses['DELETE /api/status-list-config'] = 'unreachable';
    const element = await render();

    expect(await click(element, 'Save Configuration')).toBe(
      `Failed to save configuration: ${unreachableHint}`
    );
    expect(await click(element, 'Reset to Defaults')).toBe(
      `Failed to reset configuration: ${unreachableHint}`
    );
    // The stored settings are still there, so Reset stays available.
    fixture.detectChanges();
    expect(snackBar.open).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.configForm.value.capacity).toBe(10000);
    expect(button(element, 'Reset to Defaults').disabled).toBe(false);
  });
});
