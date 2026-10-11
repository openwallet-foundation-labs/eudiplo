import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { describeListStates } from '../../common/base-async-list.testing';
import { ConfigOwnershipService } from '../../config-portability/config-ownership.service';
import { WebhookEndpointService } from '../webhook-endpoint.service';
import { WebhookEndpointListComponent } from './webhook-endpoint-list.component';

describe('WebhookEndpointListComponent', () => {
  it('shows loading, then the error with a retry, then the empty state', async () => {
    let fail!: (error: unknown) => void;
    const getAll = vi
      .fn()
      .mockReturnValueOnce(new Promise((_, reject) => (fail = reject)))
      .mockResolvedValueOnce([]);
    await TestBed.configureTestingModule({
      imports: [WebhookEndpointListComponent],
      providers: [
        provideRouter([]),
        { provide: WebhookEndpointService, useValue: { getAll } },
        { provide: ConfigOwnershipService, useValue: { isManaged: async () => false } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(WebhookEndpointListComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('mat-spinner')).not.toBeNull();

    fail({ statusCode: 403, message: 'Forbidden resource' });
    await vi.waitFor(() => expect(fixture.componentInstance.loading).toBe(false));
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Failed to load webhook endpoints: Forbidden resource'
    );
    expect(element.querySelector('table')).toBeNull();

    (element.querySelector('app-load-error button') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(fixture.componentInstance.loading).toBe(false));
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.textContent).toContain('No webhook endpoints yet.');
  });

  describeListStates({
    component: WebhookEndpointListComponent,
    service: WebhookEndpointService,
    fetchMethod: 'getAll',
    item: { id: 'notify', name: 'Notify', url: 'https://hooks.example', auth: { type: 'none' } },
    loading: 'Loading webhook endpoints',
    empty: 'No webhook endpoints yet.',
    create: 'Create Webhook Endpoint',
    createButton: 'Create New Webhook Endpoint',
    failure: 'Failed to load webhook endpoints',
  });
});
