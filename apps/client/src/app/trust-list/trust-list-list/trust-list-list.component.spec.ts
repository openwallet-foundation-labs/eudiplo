import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { client } from '@eudiplo/sdk-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TrustListListComponent } from './trust-list-list.component';

describe('TrustListListComponent', () => {
  let component: TrustListListComponent;
  let fixture: ComponentFixture<TrustListListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustListListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TrustListListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('TrustListListComponent loading', () => {
  afterEach(() => {
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
  });

  it('says why the trust lists could not be loaded', async () => {
    stubFetch(403, { statusCode: 403, message: 'Forbidden resource' });
    const component = new TrustListListComponent({ open: vi.fn() } as never);

    await component.loadLists();

    expect(component.loadError).toBe('Failed to load trust lists: Forbidden resource');
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
