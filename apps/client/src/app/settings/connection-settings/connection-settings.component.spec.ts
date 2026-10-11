import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ApiService } from '../../core';
import type { ConfigImportMode } from '../../services/frontend-config.service';
import { FrontendConfigService } from '../../services/frontend-config.service';
import { VersionService } from '../../services/version.service';
import { ConnectionSettingsComponent } from './connection-settings.component';

describe('ConnectionSettingsComponent', () => {
  let version: Partial<VersionService>;
  /** What the frontend config request returns; null when it fails. */
  let importMode: ConfigImportMode | null;
  let fixture: ComponentFixture<ConnectionSettingsComponent>;

  async function render(): Promise<HTMLElement> {
    const frontendConfig = {
      configImportMode: null as ConfigImportMode | null,
      getConfig: async () => {
        frontendConfig.configImportMode = importMode;
        return importMode ? { configImportMode: importMode } : null;
      },
    };
    TestBed.configureTestingModule({
      imports: [ConnectionSettingsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ApiService,
          useValue: {
            getBaseUrl: () => 'http://localhost:3000',
            getClientId: () => 'demo',
            getClientSecret: () => undefined,
            getoidcUrl: () => undefined,
            canRefreshToken: () => false,
          },
        },
        { provide: VersionService, useValue: version },
        { provide: FrontendConfigService, useValue: frontendConfig },
      ],
    });
    fixture = TestBed.createComponent(ConnectionSettingsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const value = (page: HTMLElement, label: string) =>
    (page.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement).value;

  beforeEach(() => {
    importMode = 'disabled';
    version = {
      check: () => Promise.resolve(),
      client: { version: '10.0.0', revision: 'abcdef0123' },
      backend: { version: '10.0.0', revision: 'abcdef0123' },
      compatibility: 'match',
    };
  });

  it('loads and shows the versions and the configuration import mode', async () => {
    const page = await render();

    expect(value(page, 'Backend version')).toBe('10.0.0 (commit abcdef0)');
    expect(value(page, 'Client version')).toBe('10.0.0 (commit abcdef0)');
    expect(value(page, 'Startup configuration import mode')).toBe('disabled');
    expect(page.textContent).not.toContain('different builds');
  });

  it('says when client and backend come from different builds', async () => {
    version.backend = { version: '9.1.0' };
    version.compatibility = 'mismatch';

    const page = await render();

    expect(value(page, 'Backend version')).toBe('9.1.0');
    expect(page.querySelector('.hint-row.warning')?.textContent).toContain(
      'Use the client image with the same tag as the backend.'
    );
  });

  it('says a value is unavailable once its request has failed', async () => {
    version.backend = null;
    importMode = null;

    const page = await render();

    expect(value(page, 'Backend version')).toBe('Unavailable');
    expect(value(page, 'Startup configuration import mode')).toBe('Unavailable');
  });
});
