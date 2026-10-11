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

  /** Clicks a button and returns the message of the snackbar that reports the outcome. */
  async function click(element: HTMLElement, label: string): Promise<string> {
    const button = [...element.querySelectorAll('button')].find((b) =>
      b.textContent?.includes(label)
    );
    if (!button) throw new Error(`No button "${label}"`);
    snackBar.open.mockClear();
    button.click();
    await vi.waitFor(() => expect(snackBar.open).toHaveBeenCalled());
    return snackBar.open.mock.calls[0][0] as string;
  }

  beforeEach(async () => {
    responses = { 'GET /api/status-list-config': { status: 200, body: { capacity: 10000 } } };
    snackBar = { open: vi.fn() };
    client.setConfig({
      fetch: vi.fn<typeof fetch>(async (input) => {
        const request = input as Request;
        const stub = responses[`${request.method} ${new URL(request.url).pathname}`] ?? {
          status: 404,
          body: {},
        };
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
  });

  it('says when the backend cannot be reached while loading', async () => {
    responses['GET /api/status-list-config'] = 'unreachable';

    await render();

    expect(snackBar.open).toHaveBeenCalledWith(
      `Failed to load status list configuration: ${unreachableHint}`,
      'Close',
      { duration: 5000 }
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

    expect(await click(element, 'Save Configuration')).toBe(
      'Failed to save configuration: Validation failed (capacity: Too big)'
    );
  });

  it('says when the backend cannot be reached on save and on reset', async () => {
    responses['PUT /api/status-list-config'] = 'unreachable';
    responses['DELETE /api/status-list-config'] = 'unreachable';
    const element = await render();

    expect(await click(element, 'Save Configuration')).toBe(
      `Failed to save configuration: ${unreachableHint}`
    );
    expect(await click(element, 'Reset to Defaults')).toBe(
      `Failed to reset configuration: ${unreachableHint}`
    );
  });
});
