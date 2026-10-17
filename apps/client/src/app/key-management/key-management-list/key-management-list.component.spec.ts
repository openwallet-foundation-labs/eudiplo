import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { keyChainDeleteQuestion } from '../key-chain-delete-question';
import { KeyChainService } from '../key-chain.service';
import { KeyManagementListComponent } from './key-management-list.component';

describe('KeyManagementListComponent', () => {
  let component: KeyManagementListComponent;
  let fixture: ComponentFixture<KeyManagementListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyManagementListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyManagementListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('KeyManagementListComponent loading', () => {
  it('shows why the keys could not be loaded instead of "No keys configured", and retries', async () => {
    const getAll = vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 403, message: 'Forbidden resource' })
      .mockResolvedValueOnce([]);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [KeyManagementListComponent],
      providers: [provideRouter([]), { provide: KeyChainService, useValue: { getAll } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(KeyManagementListComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.isLoading).toBe(false));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Failed to load keys: Forbidden resource'
    );
    expect(element.textContent).not.toContain('No keys configured');

    await fixture.componentInstance.loadAllKeys();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.textContent).toContain('No keys configured');
  });
});

describe('KeyManagementListComponent delete', () => {
  const item = { id: 'signing', description: 'PID signing' } as never;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('asks the shared question and sends one request when Delete is selected twice', async () => {
    let finish!: () => void;
    const keyChainService = {
      delete: vi.fn().mockReturnValue(new Promise<void>((done) => (finish = done))),
      getAll: vi.fn().mockResolvedValue([]),
    };
    const component = new KeyManagementListComponent(
      keyChainService as never,
      { open: vi.fn() } as never
    );
    vi.spyOn(component, 'loadAllKeys').mockResolvedValue();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const event = { stopPropagation: vi.fn() } as unknown as Event;

    const first = component.deleteItem(item, event);
    expect(component.deletingIds.has('signing')).toBe(true);
    await component.deleteItem(item, event);
    finish();
    await first;

    expect(window.confirm).toHaveBeenCalledOnce();
    expect(window.confirm).toHaveBeenCalledWith(keyChainDeleteQuestion('signing', 'PID signing'));
    expect(keyChainService.delete).toHaveBeenCalledTimes(1);
    expect(component.deletingIds.has('signing')).toBe(false);
  });
});
