import { describe, expect, it, vi } from 'vitest';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { IssuanceConfigShowComponent } from './issuance-config-show.component';
import { renderDownloadButton } from '../../../config-portability/config-document.testing';
import { IssuanceConfigService } from '../issuance-config.service';

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
  it('downloads the configuration document', async () => {
    const downloadWithFeedback = vi.fn().mockResolvedValue(undefined);
    const component = new IssuanceConfigShowComponent(
      {} as never,
      {} as never,
      {} as never,
      { downloadWithFeedback } as never
    );
    component.config = {} as never;

    await component.downloadConfig();

    expect(downloadWithFeedback).toHaveBeenCalledWith('IssuanceConfig', 'issuance');
  });

  it('disables the button while the document is being downloaded', async () => {
    const button = await renderDownloadButton(IssuanceConfigShowComponent, {
      providers: [{ provide: IssuanceConfigService, useValue: { getConfig: async () => ({}) } }],
      loaded: (component) => !!component.config,
      downloading: ['IssuanceConfig', 'issuance'],
    });

    expect(button?.getAttribute('aria-disabled')).toBe('true');
    expect(button?.getAttribute('aria-busy')).toBe('true');
  });

  it('stays enabled while another resource is being downloaded', async () => {
    const button = await renderDownloadButton(IssuanceConfigShowComponent, {
      providers: [{ provide: IssuanceConfigService, useValue: { getConfig: async () => ({}) } }],
      loaded: (component) => !!component.config,
      downloading: ['IssuanceConfig', 'other'],
    });

    expect(button).not.toBeNull();
    expect(button?.getAttribute('aria-disabled')).not.toBe('true');
    expect(button?.getAttribute('aria-busy')).toBe('false');
  });
});
