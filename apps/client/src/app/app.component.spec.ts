import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { NEVER } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppComponent } from './app.component';
import { ApiService } from './core';
import { JwtService, type Role } from './services/jwt.service';

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

  it('hides Webhook Endpoints from clients that cannot manage them', () => {
    expect(menuItems(['issuance:offer', 'presentation:request'])).not.toContain(
      'Webhook Endpoints'
    );
  });
});

describe('AppComponent session expiry', () => {
  it('warns on any page before a token without refresh expires', async () => {
    const open = vi.fn<(message: string, action: string) => object>(() => ({
      onAction: () => NEVER,
      afterDismissed: () => NEVER,
    }));
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: MatSnackBar, useValue: { open } },
        {
          provide: ApiService,
          useValue: {
            accessToken: 'token',
            getAuthenticationStatus: () => true,
            getTokenTimeRemaining: () => 4 * 60_000,
            canRefreshToken: () => false,
            getBaseUrl: () => undefined,
            getClientId: () => undefined,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    await vi.waitFor(() => expect(open).toHaveBeenCalled());
    expect(open.mock.calls[0][0]).toBe('Your session expires in 4 minutes. Save your work.');
    fixture.destroy();
  });
});

describe('AppComponent help menu', () => {
  function helpLinks(baseUrl: string | undefined): { text: string; href: string | null }[] {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        {
          provide: ApiService,
          useValue: {
            accessToken: '',
            getAuthenticationStatus: () => false,
            getTokenTimeRemaining: () => 0,
            canRefreshToken: () => false,
            getBaseUrl: () => baseUrl,
            getClientId: () => undefined,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.shouldShowToolbar = true;
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    (element.querySelector('button[aria-label="Help and resources"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const links = Array.from(document.querySelectorAll('.mat-mdc-menu-panel a'), (link) => ({
      text: link.querySelector('span')?.textContent?.trim() ?? '',
      href: link.getAttribute('href'),
    }));
    fixture.destroy();
    return links;
  }

  it("links the instance's management API reference", () => {
    expect(helpLinks('https://eudiplo.example')).toContainEqual({
      text: 'API reference of this instance',
      href: 'https://eudiplo.example/api/docs',
    });
  });

  it('leaves the API reference out while no instance is configured', () => {
    expect(helpLinks(undefined).map((link) => link.text)).toEqual([
      'Documentation',
      'GitHub',
      'Discord community',
    ]);
  });
});
