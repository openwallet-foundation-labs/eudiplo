import { describe, expect, it, vi } from 'vitest';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { IssuanceConfigShowComponent } from './issuance-config-show.component';

describe('IssuanceConfigShowComponent', () => {
  let component: IssuanceConfigShowComponent;
  let fixture: ComponentFixture<IssuanceConfigShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssuanceConfigShowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IssuanceConfigShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the effective default token lifetime per authorization server type', () => {
    component.config = {
      authorizationServers: [
        { type: 'built-in', id: 'issuer-built-in' },
        { type: 'chained', id: 'chained' },
        { type: 'oid4vp', id: 'vp', token: { lifetimeSeconds: 900 } },
      ],
    } as any;
    expect(component.authorizationServerRows.map((row) => row.tokenLifetime)).toEqual([
      300, 3600, 900,
    ]);
  });
});

describe('IssuanceConfigShowComponent loading', () => {
  it('says why the issuer settings could not be loaded instead of a blank page', async () => {
    const component = new IssuanceConfigShowComponent(
      {
        getConfig: vi.fn().mockRejectedValue({ statusCode: 403, message: 'Forbidden resource' }),
      } as never,
      { open: vi.fn() } as never,
      {} as never
    );

    component.loadConfig();

    await vi.waitFor(() =>
      expect(component.loadError).toBe('Failed to load issuer settings: Forbidden resource')
    );
  });
});
