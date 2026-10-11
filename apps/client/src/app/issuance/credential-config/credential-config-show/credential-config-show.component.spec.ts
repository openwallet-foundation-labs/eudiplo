import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
