import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { client } from '@eudiplo/sdk-core';
import { vi } from 'vitest';

import { ApiService } from '../core';
import { GrafanaLinkService } from '../services/grafana-link.service';
import { JwtService } from '../services/jwt.service';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from './dashboard.service';
import { DashboardPreferencesService } from './dashboard-preferences.service';

const statusCounts = (counts: Record<string, number> = {}) => ({
  active: 0,
  fetched: 0,
  completed: 0,
  expired: 0,
  failed: 0,
  cancelled: 0,
  ...counts,
});

describe('DashboardComponent', () => {
  let roles: string[];
  let responses: Record<string, unknown>;
  let requests: string[];
  let fixture: ComponentFixture<DashboardComponent>;
  let grafanaEnabled: boolean;

  /** Waits until the dashboard data has loaded, then renders it. */
  async function settle(): Promise<void> {
    const service = TestBed.inject(DashboardService);
    await vi.waitFor(() => {
      if (service.isLoading) throw new Error('still loading');
    });
    fixture.detectChanges();
  }

  async function render(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await settle();
    return fixture.nativeElement as HTMLElement;
  }

  const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim();

  beforeEach(() => {
    roles = [];
    grafanaEnabled = false;
    responses = {};
    requests = [];
    client.setConfig({
      baseUrl: 'http://localhost:3000',
      fetch: vi.fn<typeof fetch>(async (input) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        requests.push(url.pathname);
        const body = responses[url.pathname];
        return new Response(JSON.stringify(body ?? { statusCode: 500 }), {
          status: body === undefined ? 500 : 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    });
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: { getBaseUrl: () => 'http://localhost:3000' } },
        {
          provide: JwtService,
          useValue: {
            hasRole: (role: string | string[]) => [role].flat().some((r) => roles.includes(r)),
          },
        },
        {
          provide: GrafanaLinkService,
          useValue: { getConfig: () => Promise.resolve(), isEnabled: () => grafanaEnabled },
        },
        {
          provide: DashboardPreferencesService,
          useValue: { load: <T>(defaults: T) => defaults, save: vi.fn(), reset: vi.fn() },
        },
      ],
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
  });

  it('shows failed session counts as unavailable and retries on request', async () => {
    roles = ['issuance:offer'];
    responses['/api/session'] = { items: [], total: 0, page: 1, pageSize: 5, totalPages: 0 };

    const page = await render();

    const card = Array.from(page.querySelectorAll('.stat-card-link')).find(
      (link) => text(link.querySelector('.stat-label')) === 'Total Sessions'
    );
    expect(text(card?.querySelector('.stat-value') ?? null)).toBe('–');
    expect(text(card?.querySelector('.stat-note') ?? null)).toBe('Could not be loaded');
    expect(text(page.querySelector('.warnings-card'))).toContain('Could not load session counts.');
    expect(page.querySelector('.health-card')).toBeNull();

    responses['/api/session/stats'] = {
      issuance: { total: 3, byStatus: statusCounts({ active: 3 }), lastCompletedAt: null },
    };
    const retry = Array.from(page.querySelectorAll('.warnings-card button')).find(
      (button) => text(button) === 'refresh Retry'
    ) as HTMLButtonElement;
    retry.click();
    await settle();

    expect(text(card?.querySelector('.stat-value') ?? null)).toBe('3');
    expect(page.querySelector('.warnings-card')).toBeNull();
  });

  it('links recent sessions to their page and says what they are', async () => {
    roles = ['presentation:request'];
    responses['/api/verifier/config'] = [{ id: 'age-check' }];
    responses['/api/session/stats'] = {
      presentation: { total: 1, byStatus: statusCounts({ failed: 1 }), lastCompletedAt: null },
    };
    responses['/api/session'] = {
      items: [
        {
          id: '9c100000-0000-4000-8000-000000000004',
          status: 'failed',
          updatedAt: '2026-10-10T09:00:00.000Z',
          requestId: 'age-check',
          reference: 'case-42',
          failureCode: 'trust_chain_not_trusted',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 5,
      totalPages: 1,
    };

    const page = await render();

    const row = page.querySelector('.activity-row') as HTMLAnchorElement;
    expect(row.getAttribute('href')).toBe(
      '/session-management/9c100000-0000-4000-8000-000000000004'
    );
    expect(text(row.querySelector('strong'))).toBe('Presentation failed');
    expect(text(row.querySelector('small'))).toBe(
      'age-check · case-42 · trust_chain_not_trusted · 9c100000'
    );
  });

  it('links a warning to the page that fixes it', async () => {
    roles = ['presentation:manage'];
    responses['/api/key-chain'] = [
      {
        id: 'access',
        usageType: 'access',
        activeCertificate: { pem: 'pem', notAfter: '2999-01-01T00:00:00.000Z' },
      },
    ];
    responses['/api/verifier/config'] = [{ id: 'pid' }];
    responses['/api/trust-list'] = [];

    const page = await render();

    const action = page.querySelector('.warnings-card a') as HTMLAnchorElement;
    expect(text(action)).toBe('Add Trust List');
    expect(action.getAttribute('href')).toBe('/trust-list/create');
  });

  it('hides the health card when no signal applies to the role', async () => {
    roles = ['clients:manage'];

    const page = await render();

    expect(page.querySelector('.health-card')).toBeNull();
    expect(page.querySelector('.warnings-card')).toBeNull();
    expect(requests).toEqual([]);
  });

  it('says which health signals could not be loaded instead of guessing', async () => {
    roles = ['presentation:manage', 'registrar:manage'];
    responses['/api/key-chain'] = [];
    responses['/api/verifier/config'] = [{ id: 'pid' }];

    const page = await render();

    const health = text(page.querySelector('.health-card'));
    expect(health).toContain('Trust Lists: Could not be loaded');
    expect(health).toContain('Registrar: Could not be loaded');
    expect(health).toContain('Access Certificate: Missing');
  });

  it('shows a failed recent activity request with a way to the session list', async () => {
    roles = ['issuance:offer'];
    responses['/api/session/stats'] = {
      issuance: { total: 2, byStatus: statusCounts({ active: 2 }), lastCompletedAt: null },
    };

    const page = await render();

    const card = page.querySelector('.recent-activity-card');
    expect(text(card)).toContain('Recent activity could not be loaded');
    expect(card?.querySelector('a[href="/session-management"]')).not.toBeNull();
  });

  it('shows spinners and disables refreshing while loading', async () => {
    roles = ['issuance:offer'];
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });

    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.stat-card mat-spinner')).not.toBeNull();
    expect(page.querySelector('mat-progress-bar')).not.toBeNull();
    const refresh = page.querySelector(
      'button[aria-label="Refresh dashboard"]'
    ) as HTMLButtonElement;
    expect(refresh.disabled).toBe(true);
    expect(page.querySelector('.warnings-card')).toBeNull();
  });

  it('offers Grafana in the header when it is configured', async () => {
    roles = ['clients:manage'];
    grafanaEnabled = true;

    const page = await render();

    expect(page.querySelector('.header-actions button[aria-label="Open Grafana"]')).not.toBeNull();
  });

  it('shows no setup guide or blocked hint before the first load finished', async () => {
    roles = ['issuance:manage', 'issuance:offer'];
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });

    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;

    expect(text(page)).not.toContain('Getting Started');
    expect(page.querySelector('.actions-hint')).toBeNull();
  });

  it('tells monitoring users what their roles allow', async () => {
    roles = ['issuance:offer'];
    responses['/api/session/stats'] = {
      issuance: { total: 1, byStatus: statusCounts({ active: 1 }), lastCompletedAt: null },
    };
    responses['/api/session'] = { items: [], total: 1, page: 1, pageSize: 5, totalPages: 1 };

    const page = await render();

    expect(text(page.querySelector('.subtitle'))).toBe(
      'Monitoring access: your roles cannot change the issuance or presentation setup'
    );
  });

  it('opens the existing access key chain from the setup guide', async () => {
    roles = ['issuance:manage'];
    responses['/api/key-chain'] = [{ id: 'kc', usageType: 'access' }];
    responses['/api/issuer/credentials'] = [];
    responses['/api/issuer/config'] = { id: 'config' };

    const page = await render();

    const configure = Array.from(page.querySelectorAll('.setup-card a')).find(
      (link) => text(link) === 'verified Configure'
    );
    expect(configure?.getAttribute('href')).toBe('/keys/kc');
  });

  it('tells issuance:offer users why they cannot issue from here', async () => {
    roles = ['issuance:offer'];
    responses['/api/session/stats'] = {
      issuance: { total: 0, byStatus: statusCounts(), lastCompletedAt: null },
    };
    responses['/api/session'] = { items: [], total: 0, page: 1, pageSize: 5, totalPages: 0 };

    const page = await render();

    expect(text(page.querySelector('.actions-hint'))).toBe(
      'info Issuance is blocked: The issuance form needs the issuance:manage role.'
    );
  });
});
