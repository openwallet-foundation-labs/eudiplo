import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  beforeEach(async () => {
    service = { getConfig: vi.fn(), saveConfig: vi.fn(), updateConfig: vi.fn() };
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
      "This instance's outbound URL policy blocks the URL; ask the operator to allow it.";
    expect(component.configForm.get('registrarUrl')?.getError('server')).toBe(
      `Outbound URL must use HTTPS in this environment. ${hint}`
    );
    expect(snackBar.open).toHaveBeenCalledWith(hint, 'Close', expect.anything());
  });
});
