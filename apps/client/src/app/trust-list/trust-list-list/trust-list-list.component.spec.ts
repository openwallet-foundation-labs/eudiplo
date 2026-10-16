import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import type { TrustList } from '@eudiplo/sdk-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { describeListStates } from '../../common/base-async-list.testing';
import { TrustListService } from '../trust-list.service';
import { TrustListListComponent } from './trust-list-list.component';

describe('TrustListListComponent', () => {
  const trustList = {
    id: 'membership-issuers',
    description: 'Issuers of membership credentials',
  } as TrustList;

  async function render(service: Partial<TrustListService>) {
    TestBed.configureTestingModule({
      imports: [TrustListListComponent],
      providers: [provideRouter([]), { provide: TrustListService, useValue: service }],
    });
    const fixture = TestBed.createComponent(TrustListListComponent);
    const loadItems = vi.spyOn(fixture.componentInstance, 'loadItems');
    fixture.detectChanges();
    await loadItems.mock.results[0].value;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('names the trust list in the label of each row action', async () => {
    const element = await render({ getAll: async () => [trustList] });

    const row = element.querySelector('tr[mat-row]') as HTMLElement;
    expect([...row.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))).toEqual([
      'View trust list membership-issuers',
      'Edit trust list membership-issuers',
      'Download the configuration of trust list membership-issuers',
    ]);
  });

  it('downloads the configuration of the clicked trust list', async () => {
    const downloadConfig = vi.fn().mockResolvedValue(undefined);
    const element = await render({ getAll: async () => [trustList], downloadConfig });
    // The component's own MatSnackBarModule provides its instance, not the root injector.
    const open = vi.spyOn(MatSnackBar.prototype, 'open');

    element
      .querySelector<HTMLButtonElement>('button[mattooltip="Download configuration"]')
      ?.click();

    await vi.waitFor(() =>
      expect(open).toHaveBeenCalledWith('Trust list configuration downloaded', 'Close', {
        duration: 3000,
      })
    );
    expect(downloadConfig).toHaveBeenCalledWith('membership-issuers');
  });

  it('says why a configuration could not be downloaded', async () => {
    const downloadConfig = vi
      .fn()
      .mockRejectedValue({ statusCode: 404, message: 'Trust list membership-issuers not found' });
    const element = await render({ getAll: async () => [trustList], downloadConfig });
    const open = vi.spyOn(MatSnackBar.prototype, 'open');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    element
      .querySelector<HTMLButtonElement>('button[mattooltip="Download configuration"]')
      ?.click();

    await vi.waitFor(() =>
      expect(open).toHaveBeenCalledWith(
        'Failed to download configuration: Trust list membership-issuers not found',
        'Close',
        expect.objectContaining({ duration: expect.any(Number) })
      )
    );
    expect(downloadConfig).toHaveBeenCalledWith('membership-issuers');
  });

  describeListStates({
    component: TrustListListComponent,
    service: TrustListService,
    fetchMethod: 'getAll',
    item: trustList,
    loading: 'Loading trust lists',
    empty: 'No trust lists yet.',
    create: 'Create Trust List',
    // The cookbook E2E test finds the button by this tooltip.
    createButton: 'Create new Trust List',
    failure: 'Failed to load trust lists',
  });
});
