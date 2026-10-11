import { type ComponentFixture, TestBed } from '@angular/core/testing';
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
