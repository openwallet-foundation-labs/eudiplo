import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';
import type { KeyChainResponseDto } from '@eudiplo/sdk-core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KeyManagementShowComponent } from './key-management-show.component';

describe('KeyManagementShowComponent', () => {
  let component: KeyManagementShowComponent;
  let fixture: ComponentFixture<KeyManagementShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyManagementShowComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyManagementShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('KeyManagementShowComponent key export', () => {
  const keyChain = { id: 'key', usageType: 'attestation' } as KeyChainResponseDto;
  let keyChainService: { export: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let dialog: { open: ReturnType<typeof vi.fn> };
  let roles: string[];

  function create(): KeyManagementShowComponent {
    const component = new KeyManagementShowComponent(
      keyChainService as never,
      {} as never,
      snackBar as never,
      {} as never,
      dialog as never,
      { hasRole: (role: string[]) => role.some((r) => roles.includes(r)) } as never
    );
    component.keyChain = keyChain;
    return component;
  }

  beforeEach(() => {
    keyChainService = { export: vi.fn() };
    snackBar = { open: vi.fn() };
    dialog = { open: vi.fn() };
    roles = [];
  });

  it('does not offer the export without the tenant:admin or tenants:manage role', async () => {
    roles = ['issuance:manage', 'presentation:manage'];
    const component = create();

    expect(component.canExport).toBe(false);
    await component.exportKeyChain();

    expect(keyChainService.export).not.toHaveBeenCalled();
    expect(snackBar.open.mock.lastCall?.[0]).toContain('tenant:admin');
  });

  it.each(['tenant:admin', 'tenants:manage'])('offers the export with %s', (role) => {
    roles = [role];

    expect(create().canExport).toBe(true);
  });

  it('explains a rejected export', async () => {
    roles = ['tenant:admin'];
    keyChainService.export.mockRejectedValue({ statusCode: 403, message: 'Forbidden resource' });

    await create().exportKeyChain();

    expect(snackBar.open.mock.lastCall?.[0]).toContain('tenant:admin');
  });

  it("shows the backend's reason when the export fails for another reason", async () => {
    roles = ['tenant:admin'];
    keyChainService.export.mockRejectedValue({ statusCode: 404, message: 'Key chain not found' });

    await create().exportKeyChain();

    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to export key chain: Key chain not found'
    );
  });

  it('shows the public key chain as JSON without calling the export', () => {
    create().viewAsJson();

    expect(keyChainService.export).not.toHaveBeenCalled();
    expect(dialog.open.mock.lastCall?.[1].data.jsonData).toBe(keyChain);
  });
});

describe('KeyManagementShowComponent loading', () => {
  it('shows why the key chain could not be loaded instead of loading forever, and retries', async () => {
    const getById = vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 404, message: 'Key chain not found' })
      .mockResolvedValueOnce({ id: 'key', usageType: 'attestation' });
    const component = new KeyManagementShowComponent(
      { getById } as never,
      { paramMap: of(convertToParamMap({ id: 'key' })) } as never,
      { open: vi.fn() } as never,
      {} as never,
      {} as never,
      { hasRole: () => true } as never
    );

    component.ngOnInit();
    await vi.waitFor(() => expect(component.loadError).not.toBe(''));

    expect(component.loadError).toBe('Failed to load key chain: Key chain not found');
    expect(component.keyChain).toBeUndefined();

    component.retryLoad();
    await vi.waitFor(() => expect(component.keyChain?.id).toBe('key'));
    expect(component.loadError).toBe('');
    component.ngOnDestroy();
  });
});
