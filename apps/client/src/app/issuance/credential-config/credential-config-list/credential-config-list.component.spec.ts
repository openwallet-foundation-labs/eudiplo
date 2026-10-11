import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import type { CredentialConfig } from '@eudiplo/sdk-core';
import { CredentialConfigService } from '../credential-config.service';
import { JwtService } from '../../../services/jwt.service';

import { CredentialConfigListComponent } from './credential-config-list.component';

describe('CredentialConfigListComponent', () => {
  let component: CredentialConfigListComponent;
  let fixture: ComponentFixture<CredentialConfigListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CredentialConfigListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CredentialConfigListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('CredentialConfigListComponent schema badge', () => {
  async function render(roles: string[]): Promise<HTMLElement> {
    const configs = [
      {
        id: 'pid',
        config: { format: 'dc+sd-jwt', display: [{ description: 'PID' }] },
        schemaMeta: { id: 'https://registrar.example/schema-metadata/schema-1' },
      },
    ] as unknown as CredentialConfig[];
    TestBed.configureTestingModule({
      imports: [CredentialConfigListComponent],
      providers: [
        provideRouter([]),
        { provide: CredentialConfigService, useValue: { loadConfigurations: async () => configs } },
        { provide: JwtService, useValue: { hasRole: (role: string) => roles.includes(role) } },
      ],
    });
    const fixture = TestBed.createComponent(CredentialConfigListComponent);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[aria-label="Schema created"]')).not.toBeNull();
    });
    return fixture.nativeElement as HTMLElement;
  }

  it('links the schema for users who can open it', async () => {
    const badge = (await render(['issuance:manage', 'registrar:manage'])).querySelector(
      '[aria-label="Schema created"]'
    );

    expect(badge?.tagName).toBe('A');
    expect(badge?.getAttribute('href')).toMatch(/^\/schema\//);
  });

  it('shows the badge without a link when the schema pages would deny access', async () => {
    const badge = (await render(['issuance:manage'])).querySelector(
      '[aria-label="Schema created"]'
    );

    expect(badge?.tagName).toBe('SPAN');
  });
});
