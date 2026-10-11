import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterLink } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppComponent } from './app.component';
import { JwtService, type Role } from './services/jwt.service';
import {
  NAV_SECTION_ROUTES,
  NavSectionsService,
  type NavSection,
} from './services/nav-sections.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});

describe('AppComponent navigation', () => {
  function menuItems(roles: Role[]): string[] {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        {
          provide: JwtService,
          useValue: {
            hasRole: (role: Role | Role[]) =>
              (Array.isArray(role) ? role : [role]).some((r) => roles.includes(r)),
            hasTenantContext: () => true,
            canUseConfigPortability: JwtService.prototype.canUseConfigPortability,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return Array.from(
      element.querySelectorAll('mat-sidenav [matListItemTitle]'),
      (item) => item.textContent?.trim() ?? ''
    );
  }

  it.each<[string, Role[]]>([
    ['issuance', ['issuance:manage', 'issuance:offer']],
    ['verification', ['presentation:manage', 'presentation:request']],
    ['issuance and verification', ['issuance:manage', 'presentation:manage']],
  ])('lists Webhook Endpoints once for %s admins', (_, roles) => {
    expect(menuItems(roles).filter((item) => item === 'Webhook Endpoints')).toHaveLength(1);
  });

  it('shows Config Portability only with tenant:admin or tenants:manage', () => {
    expect(menuItems(['tenant:admin'])).toContain('Config Portability');
    TestBed.resetTestingModule();
    expect(menuItems(['issuance:manage', 'presentation:manage'])).not.toContain(
      'Config Portability'
    );
  });

  it('hides Webhook Endpoints from clients that cannot manage them', () => {
    expect(menuItems(['issuance:offer', 'presentation:request'])).not.toContain(
      'Webhook Endpoints'
    );
  });
});

@Component({ template: '' })
class EmptyPageComponent {}

describe('AppComponent collapsible navigation', () => {
  function render(
    hasRole: (role: Role | Role[]) => boolean = (role) => [role].flat().includes('issuance:manage')
  ) {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: 'credential-config', component: EmptyPageComponent },
          { path: 'old-credential-config', redirectTo: 'credential-config' },
          { path: 'dashboard', component: EmptyPageComponent },
        ]),
        {
          provide: JwtService,
          useValue: {
            hasRole,
            hasTenantContext: () => true,
            canUseConfigPortability: JwtService.prototype.canUseConfigPortability,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const header = () =>
      element.querySelector('button[aria-controls="nav-section-issuance"]') as HTMLButtonElement;
    const group = () => element.querySelector('#nav-section-issuance') as HTMLElement;
    return { fixture, element, header, group };
  }

  it('collapses and expands a section from its header', () => {
    const { fixture, header, group } = render();
    expect(header().getAttribute('aria-expanded')).toBe('true');
    expect(group().hidden).toBe(false);

    header().click();
    fixture.detectChanges();

    expect(header().getAttribute('aria-expanded')).toBe('false');
    expect(group().hidden).toBe(true);
    expect(group().textContent).toContain('Credential Types');

    header().click();
    fixture.detectChanges();

    expect(header().getAttribute('aria-expanded')).toBe('true');
    expect(group().hidden).toBe(false);
  });

  it('opens a collapsed section when the user navigates to one of its pages', async () => {
    const { fixture, group } = render();
    TestBed.inject(NavSectionsService).toggle('issuance');
    fixture.detectChanges();
    expect(group().hidden).toBe(true);

    await TestBed.inject(Router).navigateByUrl('/credential-config');
    fixture.detectChanges();

    expect(group().hidden).toBe(false);
  });

  it('opens the section of the page a redirect leads to', async () => {
    const { fixture, group } = render();
    TestBed.inject(NavSectionsService).toggle('issuance');

    await TestBed.inject(Router).navigateByUrl('/old-credential-config');
    fixture.detectChanges();

    expect(group().hidden).toBe(false);
  });

  it('keeps a collapse while the user filters the page of the same section', async () => {
    const { fixture, header, group } = render();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/credential-config');
    header().click();

    await router.navigateByUrl('/credential-config?q=pid');
    fixture.detectChanges();

    expect(group().hidden).toBe(true);
  });

  it('opens each section for every page it links to', () => {
    const { fixture, element } = render(() => true);
    const router = TestBed.inject(Router);
    const sections = TestBed.inject(NavSectionsService);

    for (const section of Object.keys(NAV_SECTION_ROUTES) as NavSection[]) {
      const group = fixture.debugElement.query(By.css(`#nav-section-${section}`));
      expect(group, section).not.toBeNull();
      expect(
        element.querySelector(`button[aria-controls="nav-section-${section}"]`)
      ).not.toBeNull();
      const links = group
        .queryAll(By.directive(RouterLink))
        .map((link) => router.serializeUrl(link.injector.get(RouterLink).urlTree!));
      expect(links.length, section).toBeGreaterThan(0);
      for (const link of links) expect(sections.sectionOf(link), link).toBe(section);
    }
  });
});
