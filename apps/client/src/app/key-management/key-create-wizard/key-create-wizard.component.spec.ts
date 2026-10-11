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
      'Failed to import key chain: At least one certificate is required.'
    );
  });

  it("shows the backend's reason when the import is rejected", async () => {
    keyChainService.import.mockRejectedValue({
      statusCode: 400,
      message: 'The certificate does not match the private key',
    });

    await create('-----BEGIN CERTIFICATE-----\ncert\n-----END CERTIFICATE-----').createKey();

    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to import key chain: The certificate does not match the private key'
    );
  });
});

describe('KeyCreateWizardComponent imports', () => {
  let snackBar: { open: ReturnType<typeof vi.fn> };
  const key = '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----';
  const certificate = '-----BEGIN CERTIFICATE-----\ncert\n-----END CERTIFICATE-----';
  let keyChainService: { import: ReturnType<typeof vi.fn> };

  function create(): KeyCreateWizardComponent {
    const component = new KeyCreateWizardComponent(
      new FormBuilder(),
      keyChainService as never,
      {} as never,
      {} as never,
      { navigate: vi.fn() } as never,
      snackBar as never,
      { hasRole: () => false } as never
    );
    component.configForm.patchValue({ externalPrivateKey: key, externalCertificate: certificate });
    return component;
  }

  /** A wizard on the External CA Chain step of an attestation key. */
  function externalCaChain(): KeyCreateWizardComponent {
    const component = create();
    component.usageForm.patchValue({ usage: 'attestation' });
    component.caSourceForm.patchValue({ keyChainType: 'externalCaChain' });
    component.configForm.patchValue({ rotationIntervalDays: 45, certValidityDays: 200 });
    return component;
  }

  beforeEach(() => {
    keyChainService = { import: vi.fn().mockResolvedValue({ id: 'imported' }) };
    snackBar = { open: vi.fn() };
  });

  it('imports an External CA Chain as an internal chain with rotation', async () => {
    await externalCaChain().createKey();

    expect(keyChainService.import).toHaveBeenCalledWith(
      expect.objectContaining({
        keyPem: key,
        usageType: 'attestation',
        type: 'internalChain',
        crt: [certificate],
        rotationPolicy: { enabled: true, intervalDays: 45, certValidityDays: 200 },
      })
    );
    expect(snackBar.open.mock.lastCall?.[0]).toBe('CA imported and signing key created.');
  });

  it('imports an External CA Chain as an internal chain without rotation', async () => {
    const component = externalCaChain();
    component.configForm.patchValue({ rotationEnabled: false });

    await component.createKey();

    expect(keyChainService.import).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'internalChain',
        rotationPolicy: { enabled: false, intervalDays: undefined, certValidityDays: 200 },
      })
    );
    expect(component.getSummary()).toContainEqual({ label: 'Rotation', value: 'Off' });
  });

  it('lets an invalid interval not block the form while rotation is off', () => {
    const component = externalCaChain();
    component.configForm.patchValue({ rotationIntervalDays: 0 });
    expect(component.configForm.valid).toBe(false);

    component.configForm.patchValue({ rotationEnabled: false });
    expect(component.configForm.valid).toBe(true);

    component.configForm.patchValue({ rotationEnabled: true });
    expect(component.configForm.valid).toBe(false);
  });

  it('imports an External Certificate as a standalone key chain', async () => {
    const component = create();
    component.usageForm.patchValue({ usage: 'access' });
    component.accessSourceForm.patchValue({ accessSource: 'external' });

    await component.createKey();

    const [dto] = keyChainService.import.mock.lastCall!;
    expect(dto).toMatchObject({ usageType: 'access', type: 'standalone', crt: [certificate] });
    expect(dto.rotationPolicy).toBeUndefined();
    expect(snackBar.open.mock.lastCall?.[0]).toBe('Key and certificate imported.');
  });

  it('imports an externally issued status list certificate as a standalone key chain', async () => {
    const component = create();
    component.usageForm.patchValue({ usage: 'statusList' });
    component.configForm.patchValue({ useExternalCertificate: true });

    await component.createKey();

    expect(keyChainService.import).toHaveBeenCalledWith(
      expect.objectContaining({ usageType: 'statusList', type: 'standalone' })
    );
  });
});

describe('KeyCreateWizardComponent internal chains', () => {
  let keyChainService: { create: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  function create(): KeyCreateWizardComponent {
    const component = new KeyCreateWizardComponent(
      new FormBuilder(),
      keyChainService as never,
      {} as never,
      {} as never,
      { navigate: vi.fn() } as never,
      snackBar as never,
      { hasRole: () => false } as never
    );
    component.usageForm.patchValue({ usage: 'attestation' });
    component.caSourceForm.patchValue({ keyChainType: 'internalChain' });
    return component;
  }

  beforeEach(() => {
    keyChainService = { create: vi.fn().mockResolvedValue({ id: 'created' }) };
    snackBar = { open: vi.fn().mockReturnValue({ onAction: () => of() }) };
  });

  it('names the creation when the backend refuses it', async () => {
    keyChainService.create.mockRejectedValue({ statusCode: 400, message: 'Unknown KMS provider' });

    await create().createKey();

    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to create key chain: Unknown KMS provider'
    );
  });

  it('creates an internal chain with rotation by default', async () => {
    await create().createKey();

    expect(keyChainService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'internalChain',
        rotationPolicy: { enabled: true, intervalDays: 30, certValidityDays: 365 },
      })
    );
  });

  it('creates an internal chain without rotation', async () => {
    const component = create();
    component.configForm.patchValue({ rotationEnabled: false });

    await component.createKey();

    expect(keyChainService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'internalChain',
        rotationPolicy: { enabled: false, intervalDays: undefined, certValidityDays: 365 },
      })
    );
  });

  it('blocks the form while the certificate validity is empty', () => {
    const component = create();
    component.configForm.patchValue({ certValidityDays: null });

    expect(component.configForm.valid).toBe(false);
  });

  it('lets hidden rotation fields not block a standalone key', () => {
    const component = create();
    component.configForm.patchValue({ certValidityDays: null, rotationIntervalDays: 0 });
    expect(component.configForm.valid).toBe(false);

    component.caSourceForm.patchValue({ keyChainType: 'standalone' });
    expect(component.configForm.valid).toBe(true);

    component.caSourceForm.patchValue({ keyChainType: 'internalChain' });
    expect(component.configForm.valid).toBe(false);
  });
});
