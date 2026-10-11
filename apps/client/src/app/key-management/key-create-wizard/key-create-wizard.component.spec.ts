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
