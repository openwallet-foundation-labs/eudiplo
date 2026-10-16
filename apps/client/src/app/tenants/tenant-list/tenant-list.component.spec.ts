import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { client } from '@eudiplo/sdk-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TenantListComponent } from './tenant-list.component';

describe('TenantListComponent', () => {
  let component: TenantListComponent;
  let fixture: ComponentFixture<TenantListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('TenantListComponent errors', () => {
  afterEach(() => {
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
    vi.unstubAllGlobals();
  });

  it('says why the tenants could not be loaded', async () => {
    stubFetch(403, { statusCode: 403, message: 'Forbidden resource' });
    const component = new TenantListComponent({ open: vi.fn() } as never);

    await component.loadTenants();

    expect(component.loadError).toBe('Failed to load tenants: Forbidden resource');
  });

  it('says why a tenant could not be deleted', async () => {
    stubFetch(409, { statusCode: 409, message: 'Tenant is file-managed' });
    vi.stubGlobal('confirm', () => true);
    const snackBar = { open: vi.fn() };
    const component = new TenantListComponent(snackBar as never);

    component.deleteTenant({ id: 't-1', name: 'Tenant' } as never);

    await vi.waitFor(() =>
      expect(snackBar.open.mock.lastCall?.[0]).toBe(
        'Failed to delete tenant: Tenant is file-managed'
      )
    );
  });
});

function stubFetch(status: number, body: unknown) {
  client.setConfig({
    fetch: vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        })
    ),
  });
}
