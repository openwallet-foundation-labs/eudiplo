import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

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
