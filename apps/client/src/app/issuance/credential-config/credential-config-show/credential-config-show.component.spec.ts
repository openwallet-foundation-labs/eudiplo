import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { CredentialConfig } from '@eudiplo/sdk-core';
import { JwtService } from '../../../services/jwt.service';

import { CredentialConfigShowComponent } from './credential-config-show.component';

describe('CredentialConfigShowComponent', () => {
  let component: CredentialConfigShowComponent;
  let fixture: ComponentFixture<CredentialConfigShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CredentialConfigShowComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CredentialConfigShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('CredentialConfigShowComponent schema links', () => {
  function render(roles: string[], extra: Record<string, unknown> = {}): HTMLElement {
    TestBed.configureTestingModule({
      imports: [CredentialConfigShowComponent],
      providers: [
        provideRouter([]),
        {
          provide: JwtService,
          useValue: {
            hasRole: (role: string) => roles.includes(role),
            // Read by the ownership notice the screen renders.
            canUseConfigPortability: () => false,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(CredentialConfigShowComponent);
    fixture.componentInstance.config = {
      id: 'pid',
      config: { format: 'dc+sd-jwt' },
      ...extra,
    } as unknown as CredentialConfig;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const createSchema = '[aria-label="Create schema for this configuration"]';
  const linked = { schemaMeta: { id: 'https://registrar.example/schema-metadata/schema-1' } };

  it('offers Create schema to users who can open the schema pages', () => {
    expect(
      render(['issuance:manage', 'registrar:manage']).querySelector(createSchema)
    ).not.toBeNull();
  });

  it('hides Create schema without registrar:manage, which would end in "Access denied"', () => {
    expect(render(['issuance:manage']).querySelector(createSchema)).toBeNull();
  });

  it('links the linked schema for users who can open it', () => {
    const page = render(['issuance:manage', 'registrar:manage'], linked);

    expect(page.querySelector('a[href="/schema/schema-1"]')).not.toBeNull();
  });

  it('shows the linked schema as text without registrar:manage', () => {
    const page = render(['issuance:manage'], linked);

    expect(page.querySelector('a[href="/schema/schema-1"]')).toBeNull();
    expect(page.textContent).toContain('https://registrar.example/schema-metadata/schema-1');
  });
});

describe('CredentialConfigShowComponent loading', () => {
  it('says why the configuration could not be loaded instead of a blank page', async () => {
    const component = new CredentialConfigShowComponent(
      {
        getConfig: vi.fn().mockRejectedValue({ statusCode: 403, message: 'Forbidden resource' }),
      } as never,
      {} as never,
      { snapshot: { paramMap: { get: () => 'pid' } } } as never,
      { open: vi.fn() } as never,
      { navigate: vi.fn() } as never,
      {} as never,
      { hasRole: () => true } as never,
      {} as never
    );

    component.loadConfig();

    await vi.waitFor(() =>
      expect(component.loadError).toBe(
        'Failed to load credential configuration: Forbidden resource'
      )
    );
  });
});

describe('CredentialConfigShowComponent download', () => {
  function create(download: ReturnType<typeof vi.fn>) {
    const snackBar = { open: vi.fn() };
    const configDocuments = { download, canDownload: () => true };
    const component = new CredentialConfigShowComponent(
      {} as never,
      {} as never,
      {} as never,
      snackBar as never,
      {} as never,
      {} as never,
      {} as never,
      configDocuments as never
    );
    component.config = { id: 'pid' } as never;
    return { component, snackBar };
  }

  it('downloads the configuration document', async () => {
    const download = vi.fn().mockResolvedValue('Configuration downloaded');
    const { component, snackBar } = create(download);

    await component.downloadConfig();

    expect(download).toHaveBeenCalledWith('CredentialConfig', 'pid');
    expect(snackBar.open.mock.lastCall?.[0]).toBe('Configuration downloaded');
  });

  it("shows the backend's reason when the download fails", async () => {
    const download = vi.fn().mockRejectedValue({ statusCode: 403, message: 'Forbidden resource' });
    const { component, snackBar } = create(download);

    await component.downloadConfig();

    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to download configuration: Forbidden resource'
    );
  });
});
