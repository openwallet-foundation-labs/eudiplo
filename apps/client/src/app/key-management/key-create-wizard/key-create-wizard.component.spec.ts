import { HttpErrorResponse } from '@angular/common/http';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistrarService } from '../../registrar/registrar.service';
import { JwtService } from '../../services/jwt.service';
import { KeyChainService } from '../key-chain.service';
import { KeyCreateWizardComponent } from './key-create-wizard.component';

describe('KeyCreateWizardComponent', () => {
  let fixture: ComponentFixture<KeyCreateWizardComponent>;
  let roles: string[];
  let getConfig: ReturnType<typeof vi.fn>;
  let snackBar: { open: ReturnType<typeof vi.fn> };

  async function create(granted: string[]): Promise<KeyCreateWizardComponent> {
    roles = granted;
    await TestBed.configureTestingModule({
      imports: [KeyCreateWizardComponent],
      providers: [
        provideRouter([]),
        {
          provide: KeyChainService,
          useValue: { getProviders: vi.fn().mockResolvedValue({ providers: [], default: 'db' }) },
        },
        { provide: RegistrarService, useValue: { getConfig } },
        {
          provide: JwtService,
          useValue: {
            hasRole: (role: string | string[]) => [role].flat().some((r) => roles.includes(r)),
          },
        },
      ],
    }).compileComponents();
    TestBed.overrideProvider(MatSnackBar, { useValue: snackBar });
    fixture = TestBed.createComponent(KeyCreateWizardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    getConfig = vi.fn().mockResolvedValue({ registrarUrl: 'https://registrar.example' });
    snackBar = { open: vi.fn().mockReturnValue({ onAction: () => of() }) };
  });

  it('reads the registrar configuration with registrar:manage', async () => {
    const component = await create(['keys:manage', 'registrar:manage']);

    expect(component.canUseRegistrar).toBe(true);
    expect(getConfig).toHaveBeenCalled();
  });

  it('keeps a caller without registrar:manage from registrar enrollment and says why', async () => {
    const component = await create(['keys:manage']);
    expect(component.canUseRegistrar).toBe(false);
    expect(getConfig).not.toHaveBeenCalled();

    component.accessSourceForm.get('accessSource')?.setValue('registrar');
    const next = vi.spyOn(component.stepper, 'next');
    component.onAccessSourceNext();

    expect(snackBar.open).toHaveBeenCalledWith(
      'Enrolling through the registrar needs the registrar:manage role',
      'Close',
      expect.anything()
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('does not claim that the registrar credentials work', async () => {
    const component = await create(['keys:manage', 'registrar:manage']);
    component.usageForm.patchValue({ usage: 'access' });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Registrar configured. Its credentials are checked when you enroll.');
    expect(text).not.toContain('Registrar credentials configured');
  });

  it('says that the registrar configuration could not be read, and retries', async () => {
    getConfig.mockRejectedValueOnce(
      new HttpErrorResponse({ status: 500, error: { message: 'Internal server error' } })
    );
    const component = await create(['keys:manage', 'registrar:manage']);
    component.usageForm.patchValue({ usage: 'access' });
    component.accessSourceForm.patchValue({ accessSource: 'registrar' });
    fixture.detectChanges();
    // Only the selected step can take focus.
    component.stepper.next();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain(
      'Could not check the registrar configuration: Internal server error'
    );
    expect(element.textContent).not.toContain('Registrar credentials not configured');

    const retry: HTMLButtonElement = element.querySelector('.registrar-retry button')!;
    expect(retry.closest('label')).toBeNull();
    retry.focus();
    expect(document.activeElement).toBe(retry);
    retry.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getConfig).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Registrar configured.');
    expect(element.querySelector('.registrar-retry')).toBeNull();
    expect((document.activeElement as HTMLInputElement).value).toBe('registrar');
  });

  it('keeps the user in the wizard while the key is created and enrolled', async () => {
    const component = await create(['keys:manage', 'registrar:manage']);
    component.usageForm.patchValue({ usage: 'access' });
    component.accessSourceForm.patchValue({ accessSource: 'registrar' });
    component.isSubmitting = true;
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector<HTMLButtonElement>('button[aria-label="Cancel"]')!.disabled).toBe(
      true
    );
    const back = [...element.querySelectorAll<HTMLButtonElement>('button[matStepperPrevious]')];
    expect(back.at(-1)!.disabled).toBe(true);
    expect(component.stepper.steps.toArray().map((step) => step.editable)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('shows a refused enrollment next to Create & Enroll', async () => {
    const component = await create(['keys:manage', 'registrar:manage']);
    component.usageForm.patchValue({ usage: 'access' });
    component.accessSourceForm.patchValue({ accessSource: 'registrar' });
    component.enrollmentError = {
      message: 'Refused. The new key was deleted.',
      offerRegistrar: true,
    };
    fixture.detectChanges();

    const alert: HTMLElement = fixture.nativeElement.querySelector('.enrollment-error');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain('Refused. The new key was deleted.');
    expect(alert.querySelector('a')?.getAttribute('href')).toBe('/registrar');

    component.enrollmentError = { message: 'Needs a role.', offerRegistrar: false };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.enrollment-error a')).toBeNull();
  });
});

describe('KeyCreateWizardComponent registrar enrollment', () => {
  let keyChainService: {
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let registrarService: { createAccessCertificate: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  const authenticationFailed = new HttpErrorResponse({
    status: 400,
    error: {
      statusCode: 400,
      message:
        'Failed to authenticate with registrar: the OIDC provider answered with HTTP 401, invalid_grant',
    },
  });

  /** A wizard on the last step of a registrar enrollment. */
  function create(): KeyCreateWizardComponent {
    const component = new KeyCreateWizardComponent(
      new FormBuilder(),
      keyChainService as never,
      registrarService as never,
      {} as never,
      router as never,
      snackBar as never,
      { hasRole: () => true } as never
    );
    component.usageForm.patchValue({ usage: 'access' });
    component.accessSourceForm.patchValue({ accessSource: 'registrar' });
    return component;
  }

  beforeEach(() => {
    keyChainService = {
      create: vi.fn().mockResolvedValue({ id: 'key-1' }),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    registrarService = { createAccessCertificate: vi.fn().mockResolvedValue({}) };
    router = { navigate: vi.fn() };
    snackBar = { open: vi.fn().mockReturnValue({ onAction: () => of() }) };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('opens the enrolled key', async () => {
    await create().createKey();

    expect(registrarService.createAccessCertificate).toHaveBeenCalledWith('key-1');
    expect(keyChainService.delete).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/keys', 'key-1']);
  });

  it('deletes the key and says why next to Create & Enroll when the registrar authentication fails', async () => {
    registrarService.createAccessCertificate.mockRejectedValue(authenticationFailed);
    const component = create();

    await component.createKey();

    expect(keyChainService.delete).toHaveBeenCalledWith('key-1');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(snackBar.open).not.toHaveBeenCalled();
    expect(component.isSubmitting).toBe(false);
    expect(component.enrollmentError).toEqual({
      message:
        'Failed to authenticate with registrar: the OIDC provider answered with HTTP 401, invalid_grant. ' +
        'The new key was deleted. Check the registrar configuration and try again.',
      offerRegistrar: true,
    });
  });

  it('deletes the key when the registrar configuration is gone', async () => {
    registrarService.createAccessCertificate.mockRejectedValue(
      new HttpErrorResponse({
        status: 404,
        error: { statusCode: 404, message: 'No registrar configuration found for tenant t' },
      })
    );
    const component = create();

    await component.createKey();

    expect(keyChainService.delete).toHaveBeenCalledWith('key-1');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.enrollmentError?.offerRegistrar).toBe(true);
  });

  it('deletes the key and names the missing role on 403', async () => {
    registrarService.createAccessCertificate.mockRejectedValue(
      new HttpErrorResponse({
        status: 403,
        error: { statusCode: 403, message: 'Forbidden resource' },
      })
    );
    const component = create();

    await component.createKey();

    expect(keyChainService.delete).toHaveBeenCalledWith('key-1');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.enrollmentError).toEqual({
      message:
        'Enrolling through the registrar needs the registrar:manage role. The new key was deleted.',
      offerRegistrar: false,
    });
  });

  it('clears the previous refusal when Create & Enroll is selected again', async () => {
    registrarService.createAccessCertificate.mockRejectedValueOnce(authenticationFailed);
    const component = create();
    await component.createKey();
    expect(component.enrollmentError).not.toBeNull();

    await component.createKey();

    expect(component.enrollmentError).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/keys', 'key-1']);
  });

  it('clears the refusal when the certificate source changes', async () => {
    registrarService.createAccessCertificate.mockRejectedValue(authenticationFailed);
    const component = create();
    await component.createKey();
    expect(component.enrollmentError).not.toBeNull();

    component.accessSourceForm.patchValue({ accessSource: 'selfSigned' });

    expect(component.enrollmentError).toBeNull();
  });

  it('reports a refusal in a snackbar and stays put when the user left the wizard', async () => {
    registrarService.createAccessCertificate.mockRejectedValue(authenticationFailed);
    const component = create();
    const creating = component.createKey();
    component.ngOnDestroy();

    await creating;

    expect(keyChainService.delete).toHaveBeenCalledWith('key-1');
    expect(component.enrollmentError).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(snackBar.open.mock.lastCall?.[0]).toContain('The new key was deleted.');
  });

  it('offers the kept key instead of opening it when the user left the wizard', async () => {
    registrarService.createAccessCertificate.mockRejectedValue(
      new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway', error: 'Bad Gateway' })
    );
    const component = create();
    const creating = component.createKey();
    component.ngOnDestroy();

    await creating;

    expect(router.navigate).not.toHaveBeenCalled();
    expect(snackBar.open.mock.lastCall?.[1]).toBe('View Key');
  });

  it('keeps and opens the key when it cannot be deleted, and says why', async () => {
    registrarService.createAccessCertificate.mockRejectedValue(authenticationFailed);
    keyChainService.delete.mockRejectedValue({ statusCode: 500, message: 'Internal server error' });
    const component = create();

    await component.createKey();

    expect(router.navigate).toHaveBeenCalledWith(['/keys', 'key-1']);
    expect(component.enrollmentError).toBeNull();
    const [message, action] = snackBar.open.mock.lastCall!;
    expect(message).toBe(
      'Key created without a registrar certificate: Failed to authenticate with registrar: the OIDC provider answered with HTTP 401, invalid_grant. ' +
        'Failed to delete it: Internal server error. Delete the key, check the registrar configuration, then create it again.'
    );
    expect(action).toBe('Close');
  });

  it('keeps the key when the backend did not answer, as the certificate may have been stored', async () => {
    registrarService.createAccessCertificate.mockRejectedValue(
      new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })
    );

    await create().createKey();

    expect(keyChainService.delete).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/keys', 'key-1']);
    const [message, action] = snackBar.open.mock.lastCall!;
    expect(message).toBe(
      'Key created, but its registrar enrollment failed: Failed to enroll certificate from registrar: the backend could not be reached. Check the connection and try again. ' +
        "If the key's Active Certificate has the same Issuer as Subject, it is self-signed: delete the key and create it again."
    );
    expect(action).toBe('Close');
  });

  it('keeps the key after a server error', async () => {
    registrarService.createAccessCertificate.mockRejectedValue(
      new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway', error: 'Bad Gateway' })
    );

    await create().createKey();

    expect(keyChainService.delete).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/keys', 'key-1']);
  });
});

describe('KeyCreateWizardComponent errors', () => {
  let keyChainService: { import: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  /** A wizard on the external access certificate step with this key and certificate. */
  function create(externalCertificate: string): KeyCreateWizardComponent {
    const component = new KeyCreateWizardComponent(
      new FormBuilder(),
      keyChainService as never,
      {} as never,
      {} as never,
      { navigate: vi.fn() } as never,
      snackBar as never,
      { hasRole: () => false } as never
    );
    component.usageForm.patchValue({ usage: 'access' });
    component.accessSourceForm.patchValue({ accessSource: 'external' });
    component.configForm.patchValue({
      externalPrivateKey: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----',
      externalCertificate,
    });
    return component;
  }

  beforeEach(() => {
    keyChainService = { import: vi.fn() };
    snackBar = { open: vi.fn() };
  });

  it('says what is wrong with the external certificate', async () => {
    await create('').createKey();

    expect(keyChainService.import).not.toHaveBeenCalled();
    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to create key chain: At least one certificate is required.'
    );
  });

  it("shows the backend's reason when the import is rejected", async () => {
    keyChainService.import.mockRejectedValue({
      statusCode: 400,
      message: 'The certificate does not match the private key',
    });

    await create('-----BEGIN CERTIFICATE-----\ncert\n-----END CERTIFICATE-----').createKey();

    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to create key chain: The certificate does not match the private key'
    );
  });
});
