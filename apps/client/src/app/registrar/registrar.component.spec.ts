import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigOwnershipService } from '../config-portability/config-ownership.service';
import { RegistrarComponent } from './registrar.component';
import { RegistrarConfig, RegistrarService } from './registrar.service';

const stored: RegistrarConfig = {
  registrarUrl: 'https://registrar.example/api',
  oidcUrl: 'https://auth.example/realms/registrar',
  clientId: 'eudiplo',
  username: 'user',
  hasPassword: true,
  hasClientSecret: false,
} as RegistrarConfig;

describe('RegistrarComponent', () => {
  let fixture: ComponentFixture<RegistrarComponent>;
  let component: RegistrarComponent;
  let service: {
    getConfig: ReturnType<typeof vi.fn>;
    saveConfig: ReturnType<typeof vi.fn>;
    updateConfig: ReturnType<typeof vi.fn>;
    deleteConfig: ReturnType<typeof vi.fn>;
  };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  async function render(config: RegistrarConfig | null) {
    service.getConfig.mockResolvedValue(config);
    fixture = TestBed.createComponent(RegistrarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const errorsShown = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-error')).map((error) =>
      error.textContent?.trim()
    );

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    service = {
      getConfig: vi.fn(),
      saveConfig: vi.fn(),
      updateConfig: vi.fn(),
      deleteConfig: vi.fn().mockResolvedValue(undefined),
    };
    snackBar = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [RegistrarComponent],
      providers: [
        provideRouter([]),
        { provide: RegistrarService, useValue: service },
        {
          provide: ConfigOwnershipService,
          useValue: {
            get: vi.fn().mockResolvedValue(undefined),
            isManaged: vi.fn().mockResolvedValue(false),
          },
        },
      ],
    })
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .compileComponents();
  });

  it('shows a rejected URL at its field, and editing the field clears it', async () => {
    await render(stored);
    service.updateConfig.mockRejectedValue(
      new HttpErrorResponse({
        status: 400,
        error: {
          message: 'Validation failed',
          errors: [
            {
              path: ['oidcUrl'],
              message: 'Must be an http(s) URL without query, fragment or credentials',
              code: 'custom',
            },
          ],
        },
      })
    );

    await component.saveConfig();
    fixture.detectChanges();

    const oidcUrl = component.configForm.get('oidcUrl')!;
    expect(oidcUrl.getError('server')).toBe(
      'Must be an http(s) URL without query, fragment or credentials'
    );
    expect(errorsShown()).toContain(
      'Must be an http(s) URL without query, fragment or credentials'
    );
    expect(snackBar.open).toHaveBeenCalledWith(
      'Please correct the highlighted fields',
      'Close',
      expect.anything()
    );
    oidcUrl.setValue('https://auth.other.example/realms/registrar');
    expect(oidcUrl.getError('server')).toBeNull();
  });

  it('saves again after a rejection without an edit and clears the old error', async () => {
    await render(stored);
    service.updateConfig.mockRejectedValueOnce(
      new HttpErrorResponse({
        status: 400,
        error: {
          errors: [
            {
              path: ['oidcUrl'],
              message: 'Outbound URL host is not in the allowlist',
              code: 'outbound_url_policy',
            },
          ],
        },
      })
    );
    await component.saveConfig();
    expect(component.hasInvalidInput).toBe(false);

    // The operator allowed the host in the meantime.
    service.updateConfig.mockResolvedValueOnce(stored);
    await component.saveConfig();
    fixture.detectChanges();

    expect(service.updateConfig).toHaveBeenCalledTimes(2);
    expect(component.configForm.get('oidcUrl')?.getError('server')).toBeNull();
    expect(errorsShown().join(' ')).not.toContain('allowlist');
  });

  it('sends trimmed certificate defaults and no empty password on update', async () => {
    await render(stored);
    service.updateConfig.mockResolvedValue(stored);
    component.configForm.patchValue({
      registrationCertificateDefaults: {
        privacy_policy: '  https://p.example  ',
        support_uri: '',
        intermediary: '',
      },
    });

    await component.saveConfig();

    const [body] = service.updateConfig.mock.calls[0];
    // Unchanged URLs are left out of the PATCH.
    expect(body).not.toHaveProperty('registrarUrl');
    expect(body).toMatchObject({ clientSecret: undefined });
    expect(body.registrationCertificateDefaults).toEqual({ privacy_policy: 'https://p.example' });
    expect(body).not.toHaveProperty('password');
  });

  it('keeps certificate defaults that the form does not show', async () => {
    await render({
      ...stored,
      registrationCertificateDefaults: {
        privacy_policy: 'https://old.example',
        provides_attestations: [{ format: 'dc+sd-jwt' }],
      },
    });
    service.updateConfig.mockResolvedValue(stored);
    component.configForm.patchValue({ registrationCertificateDefaults: { privacy_policy: '' } });

    await component.saveConfig();

    expect(service.updateConfig.mock.calls[0][0].registrationCertificateDefaults).toEqual({
      provides_attestations: [{ format: 'dc+sd-jwt' }],
    });
  });

  it('makes the password optional once a new configuration is saved', async () => {
    await render(null);
    service.saveConfig.mockResolvedValue({ ...stored, hasPassword: true });
    component.configForm.patchValue({
      registrarUrl: stored.registrarUrl,
      oidcUrl: stored.oidcUrl,
      clientId: stored.clientId,
      username: stored.username,
      password: 'secret',
    });
    await component.saveConfig();

    component.configForm.get('password')?.setValue('');
    expect(component.configForm.get('password')?.valid).toBe(true);
  });

  it('sends an edited stored default with its new value', async () => {
    const attestations = [{ format: 'dc+sd-jwt' }];
    await render({
      ...stored,
      registrationCertificateDefaults: {
        privacy_policy: 'https://old.example',
        provides_attestations: attestations,
      },
    });
    service.updateConfig.mockResolvedValue(stored);
    component.configForm.patchValue({
      registrationCertificateDefaults: { privacy_policy: 'https://new.example' },
    });

    await component.saveConfig();

    expect(service.updateConfig.mock.calls[0][0].registrationCertificateDefaults).toEqual({
      privacy_policy: 'https://new.example',
      provides_attestations: attestations,
    });
  });

  it('sends null certificate defaults when all are empty', async () => {
    await render(stored);
    service.updateConfig.mockResolvedValue(stored);

    await component.saveConfig();

    expect(service.updateConfig.mock.calls[0][0].registrationCertificateDefaults).toBeNull();
  });

  it('creates a new configuration with POST', async () => {
    await render(null);
    service.saveConfig.mockResolvedValue(stored);
    component.configForm.patchValue({
      registrarUrl: stored.registrarUrl,
      oidcUrl: stored.oidcUrl,
      clientId: stored.clientId,
      username: stored.username,
      password: 'secret',
    });

    await component.saveConfig();

    expect(service.saveConfig).toHaveBeenCalledTimes(1);
    expect(service.saveConfig.mock.calls[0][0]).toMatchObject({ password: 'secret' });
    expect(service.updateConfig).not.toHaveBeenCalled();
  });

  it('shows the backend message when no field error applies', async () => {
    await render(stored);
    service.updateConfig.mockRejectedValueOnce(
      new HttpErrorResponse({ status: 503, error: { message: 'Registrar unreachable' } })
    );
    await component.saveConfig();
    expect(snackBar.open).toHaveBeenLastCalledWith(
      'Registrar unreachable',
      'Close',
      expect.anything()
    );

    service.updateConfig.mockRejectedValueOnce(new HttpErrorResponse({ status: 500, error: {} }));
    await component.saveConfig();
    expect(snackBar.open).toHaveBeenLastCalledWith(
      'Failed to save configuration',
      'Close',
      expect.anything()
    );
  });

  it('shows why loading failed instead of an empty form, and retries', async () => {
    service.getConfig.mockRejectedValueOnce(
      new HttpErrorResponse({ status: 503, error: { message: 'Database unavailable' } })
    );
    await render(stored);

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Database unavailable');
    expect(element.querySelector('form')).toBeNull();

    const retry = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Retry'
    );
    retry?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(service.getConfig).toHaveBeenCalledTimes(2);
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.querySelector('form')).not.toBeNull();
  });

  it('suggests checking the host name when it cannot be resolved', async () => {
    await render(stored);
    service.updateConfig.mockRejectedValueOnce(
      new HttpErrorResponse({
        status: 400,
        error: {
          errors: [
            {
              path: ['oidcUrl'],
              message: 'Outbound URL host cannot be resolved',
              code: 'outbound_url_policy',
            },
          ],
        },
      })
    );

    await component.saveConfig();

    expect(component.configForm.get('oidcUrl')?.getError('server')).toBe(
      'Outbound URL host cannot be resolved. Check the host name, or try again later.'
    );
    expect(snackBar.open).toHaveBeenLastCalledWith(
      'Check the host name, or try again later.',
      'Close',
      expect.anything()
    );
  });

  it('shows a rejected new URL at its field and saves it again with POST', async () => {
    await render(stored);
    service.saveConfig.mockRejectedValueOnce(
      new HttpErrorResponse({
        status: 400,
        error: {
          errors: [
            {
              path: ['registrarUrl'],
              message: 'Outbound URL host is not in the allowlist',
              code: 'outbound_url_policy',
            },
          ],
        },
      })
    );
    component.configForm.patchValue({
      registrarUrl: 'https://registrar.other.example/api',
      password: 'new-password',
    });

    await component.saveConfig();
    fixture.detectChanges();
    expect(errorsShown().join(' ')).toContain('Outbound URL host is not in the allowlist');

    service.saveConfig.mockResolvedValueOnce(stored);
    await component.saveConfig();

    expect(service.saveConfig).toHaveBeenCalledTimes(2);
    expect(service.saveConfig.mock.calls[1][0]).toMatchObject({
      registrarUrl: 'https://registrar.other.example/api',
      password: 'new-password',
    });
    expect(service.updateConfig).not.toHaveBeenCalled();
  });

  it('highlights a stored URL that breaks the base URL rule right after loading', async () => {
    await render({ ...stored, oidcUrl: 'https://auth.example/realms/registrar#' });

    expect(component.hasInvalidInput).toBe(true);
    expect(errorsShown()).toContain('Enter an http(s) URL without query, fragment or credentials');
  });

  it('keeps Save disabled and names the missing fields of a new configuration', async () => {
    await render(null);
    const save = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Save Configuration')
    );
    expect(save?.disabled).toBe(true);

    component.configForm.markAllAsTouched();
    fixture.detectChanges();

    expect(errorsShown()).toEqual(
      expect.arrayContaining([
        'Registrar URL is required',
        'OIDC URL is required',
        'Client ID is required',
        'Username is required',
        'Password is required',
      ])
    );
  });

  it('says that the operator has to allow a URL the policy blocks', async () => {
    await render(stored);
    service.updateConfig.mockRejectedValue(
      new HttpErrorResponse({
        status: 400,
        error: {
          message: 'Rejected by the outbound URL policy of this instance: ...',
          errors: [
            {
              path: ['registrarUrl'],
              message: 'Outbound URL must use HTTPS in this environment',
              code: 'outbound_url_policy',
            },
          ],
        },
      })
    );

    await component.saveConfig();

    const hint =
      "Check the URL; if it is correct, ask the operator to allow it in this instance's outbound URL policy.";
    expect(component.configForm.get('registrarUrl')?.getError('server')).toBe(
      `Outbound URL must use HTTPS in this environment. ${hint}`
    );
    expect(snackBar.open).toHaveBeenCalledWith(hint, 'Close', expect.anything());
  });
});
