import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { StatusListManagementService } from '../status-list-management.service';
import { StatusListListComponent } from './status-list-list.component';

describe('StatusListListComponent', () => {
  it('shows why loading failed instead of "No status lists found", and retries', async () => {
    const getLists = vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 403, message: 'Forbidden resource' })
      .mockResolvedValueOnce([]);
    await TestBed.configureTestingModule({
      imports: [StatusListListComponent],
      providers: [
        provideRouter([]),
        { provide: StatusListManagementService, useValue: { getLists } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(StatusListListComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.isLoading).toBe(false));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Failed to load status lists: Forbidden resource'
    );
    expect(element.textContent).not.toContain('No status lists found');

    await fixture.componentInstance.refresh();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.textContent).toContain('No status lists found');
  });
});
