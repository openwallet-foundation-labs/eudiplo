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

  it('shows the status check mode that applies per authorization server', () => {
    component.config = {
      walletAttestationStatusCheckMode: 'strict',
      authorizationServers: [
        { type: 'built-in', id: 'issuer-built-in' },
        { type: 'chained', id: 'chained', walletAttestationStatusCheckMode: 'disabled' },
        { type: 'external', id: 'ext', issuer: 'https://as.example' },
      ],
    } as any;
    expect(component.authorizationServerRows.map((row) => row.statusCheck)).toEqual([
      'Issuer default: Strict',
      'Disabled',
      '-',
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
      {} as never,
      {} as never
    );

    component.loadConfig();

    await vi.waitFor(() =>
      expect(component.loadError).toBe('Failed to load issuer settings: Forbidden resource')
    );
  });
});

describe('IssuanceConfigShowComponent download', () => {
  function create(download: ReturnType<typeof vi.fn>) {
    const snackBar = { open: vi.fn() };
    const configDocuments = { download, canDownload: () => true };
    const component = new IssuanceConfigShowComponent(
      {} as never,
      snackBar as never,
      {} as never,
      configDocuments as never
    );
    component.config = {} as never;
    return { component, snackBar };
  }

  it('downloads the configuration document', async () => {
    const download = vi.fn().mockResolvedValue('Configuration downloaded');
    const { component, snackBar } = create(download);

    await component.downloadConfig();

    expect(download).toHaveBeenCalledWith('IssuanceConfig', 'issuance');
    expect(snackBar.open.mock.lastCall?.[0]).toBe('Configuration downloaded');
  });

  it("shows the backend's reason when the download fails", async () => {
    const download = vi.fn().mockRejectedValue({ statusCode: 403, message: 'Forbidden resource' });
    const { component, snackBar } = create(download);

    await component.downloadConfig();

    expect(snackBar.open.mock.lastCall?.[0]).toBe('Failed to download configuration: Forbidden resource');
  });
});
