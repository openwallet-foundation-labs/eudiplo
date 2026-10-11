import { TestBed } from '@angular/core/testing';
import { client } from '@eudiplo/sdk-core';
import { vi } from 'vitest';

import { JwtService } from '../services/jwt.service';
import { DashboardService } from './dashboard.service';

const statusCounts = (counts: Record<string, number> = {}) => ({
  active: 0,
  fetched: 0,
  completed: 0,
  expired: 0,
  failed: 0,
  cancelled: 0,
  ...counts,
});

const day = 24 * 60 * 60 * 1000;
const accessKeyChain = (expiresInDays: number, id = 'access') => ({
  id,
  usageType: 'access',
  activeCertificate: {
    pem: '-----BEGIN CERTIFICATE-----',
    notAfter: new Date(Date.now() + expiresInDays * day).toISOString(),
  },
});

/** Answers of a tenant whose issuance is fully set up. */
const issuanceSetUp = {
  '/api/key-chain': [accessKeyChain(365)],
  '/api/issuer/credentials': [{ id: 'pid' }],
  '/api/issuer/config': { id: 'config' },
};

describe('DashboardService', () => {
  let roles: string[];
  let responses: Record<string, unknown>;
  /** HTTP status per path for requests that fail; other unknown paths answer 404. */
  let failures: Record<string, number>;
  let requests: string[];
  let service: DashboardService;

  const messages = () => service.warnings.map((warning) => warning.message);

  beforeEach(() => {
    roles = [];
    responses = {};
    failures = {};
    requests = [];
    client.setConfig({
      baseUrl: 'http://localhost:3000',
      fetch: vi.fn<typeof fetch>(async (input) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        requests.push(url.pathname + url.search);
        const body = responses[url.pathname];
        const status = body === undefined ? (failures[url.pathname] ?? 404) : 200;
        return new Response(JSON.stringify(status === 200 ? body : { statusCode: status }), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: JwtService,
          useValue: {
            hasRole: (role: string | string[]) => [role].flat().some((r) => roles.includes(r)),
          },
        },
      ],
    });
    service = TestBed.inject(DashboardService);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
  });

  it('counts sessions of every status and page from the stats endpoint', async () => {
    roles = ['issuance:offer', 'presentation:request'];
    responses['/api/verifier/config'] = [];
    responses['/api/session/stats'] = {
      issuance: {
        total: 30,
        byStatus: statusCounts({ active: 20, cancelled: 10 }),
        lastCompletedAt: null,
      },
      presentation: {
        total: 5,
        byStatus: statusCounts({ completed: 5 }),
        lastCompletedAt: '2026-10-10T08:00:00.000Z',
      },
    };
    responses['/api/session'] = {
      items: [{ id: 'session-1', status: 'active', updatedAt: '2026-10-10T09:00:00.000Z' }],
      total: 35,
      page: 1,
      pageSize: 5,
      totalPages: 7,
    };

    await service.getCounters();

    expect(service.totalSessions).toBe(35);
    expect(service.sessionActive).toBe(20);
    expect(service.sessionCancelled).toBe(10);
    expect(service.sessionCompleted).toBe(5);
    expect(service.lastSuccessfulIssuanceAt).toBeNull();
    expect(service.lastSuccessfulPresentationAt).toBe('2026-10-10T08:00:00.000Z');
    expect(service.recentSessions.map((session) => session.id)).toEqual(['session-1']);
    expect(requests).toContain('/api/session?pageSize=5&sortBy=updatedAt&sortOrder=desc');
    expect(service.warnings).toEqual([]);
    expect(service.lastUpdatedAt).toBeInstanceOf(Date);
  });

  it('raises no access certificate warning for users who cannot read key chains', async () => {
    roles = ['issuance:offer'];
    responses['/api/session/stats'] = {
      issuance: { total: 1, byStatus: statusCounts({ active: 1 }), lastCompletedAt: null },
    };
    responses['/api/session'] = { items: [], total: 1, page: 1, pageSize: 5, totalPages: 1 };

    await service.getCounters();

    expect(requests).not.toContain('/api/key-chain');
    expect(service.warnings).toEqual([]);
    expect(service.hasHealthSignals).toBe(true);
  });

  it('reports each failed request with a retry instead of showing it as empty', async () => {
    roles = ['issuance:offer'];
    failures['/api/session/stats'] = 500;
    failures['/api/session'] = 503;

    await service.getCounters();

    expect(service.hasFailed('sessionStats')).toBe(true);
    expect(service.isLoaded('sessionStats')).toBe(false);
    expect(service.hasFailed('recentSessions')).toBe(true);
    expect(service.warnings).toEqual([
      { message: 'Could not load session counts.', retry: true },
      { message: 'Could not load recent sessions.', retry: true },
    ]);
    expect(service.hasHealthSignals).toBe(false);
  });

  it("gives the backend's reason and no retry when a retry cannot help", async () => {
    roles = ['issuance:offer'];
    responses['/api/session'] = { items: [], total: 0, page: 1, pageSize: 5, totalPages: 0 };
    client.setConfig({
      fetch: async (input: RequestInfo | URL) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        const body =
          url.pathname === '/api/session/stats'
            ? { statusCode: 404, message: 'Cannot GET /api/session/stats' }
            : responses[url.pathname];
        return new Response(JSON.stringify(body), {
          status: url.pathname === '/api/session/stats' ? 404 : 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    await service.getCounters();

    expect(service.warnings).toEqual([
      { message: 'Could not load session counts: Cannot GET /api/session/stats', retry: false },
    ]);
  });

  it('does not show a setup guide built from failed requests', async () => {
    roles = ['issuance:manage'];
    failures['/api/key-chain'] = 500;
    responses['/api/issuer/credentials'] = [];
    responses['/api/issuer/config'] = { id: 'config' };

    await service.getCounters();

    expect(service.showSetupGuide).toBe(false);
    expect(service.issueReadinessReason).toBe('Key chains could not be loaded');
    expect(messages()).toEqual(['Could not load key chains.']);
  });

  it('treats a registrar 404 as not configured and links to its setup', async () => {
    roles = ['registrar:manage'];

    await service.getCounters();

    expect(service.isLoaded('registrar')).toBe(true);
    expect(service.warnings).toEqual([
      {
        message:
          'Registrar is not configured. Access certificate enrollment via registrar is unavailable.',
        action: { label: 'Configure Registrar', route: ['/registrar'] },
      },
    ]);
  });

  it('reports other registrar errors as a failed request', async () => {
    roles = ['registrar:manage'];
    failures['/api/registrar/config'] = 500;

    await service.getCounters();

    expect(service.hasFailed('registrar')).toBe(true);
    expect(messages()).toEqual(['Could not load registrar config.']);
  });

  it('links a missing trust list to the trust list form', async () => {
    roles = ['presentation:manage'];
    responses['/api/key-chain'] = [accessKeyChain(365)];
    responses['/api/verifier/config'] = [{ id: 'pid' }];
    responses['/api/trust-list'] = [];

    await service.getCounters();

    expect(service.warnings).toEqual([
      {
        message: 'No trust list configured. Presentation trust-chain validation may fail.',
        action: { label: 'Add Trust List', route: ['/trust-list/create'] },
      },
    ]);
  });

  it('shows no health signals to users whose roles have none', async () => {
    roles = ['clients:manage'];

    await service.getCounters();

    expect(service.hasHealthSignals).toBe(false);
    expect(requests).toEqual([]);
  });

  it('sends key chain managers without an access key chain to create one', async () => {
    roles = ['issuance:manage'];
    responses['/api/key-chain'] = [];
    responses['/api/issuer/credentials'] = [];
    responses['/api/issuer/config'] = { id: 'config' };

    await service.getCounters();

    expect(requests).toContain('/api/key-chain');
    // The setup guide shows the missing certificate; a warning would repeat it.
    expect(service.showSetupGuide).toBe(true);
    expect(service.warnings).toEqual([]);
    expect(service.accessCertificateRoute).toEqual(['/keys/create']);
    expect(service.verifyReadinessReason).toBe(
      'Read-only: missing presentation:manage or presentation:request role'
    );
  });

  it('names the missing key chain to presentation managers', async () => {
    roles = ['presentation:manage'];
    responses['/api/key-chain'] = [];
    responses['/api/verifier/config'] = [{ id: 'pid' }];
    responses['/api/trust-list'] = [{ id: 'list' }];

    await service.getCounters();

    expect(service.verifyReadinessReason).toBe('No key chain configured');
  });

  it('links an expiring access certificate to the key chain that expires first', async () => {
    roles = ['issuance:manage'];
    Object.assign(responses, issuanceSetUp, {
      '/api/key-chain': [accessKeyChain(400, 'healthy-later'), accessKeyChain(10, 'due')],
    });

    await service.getCounters();

    expect(service.warnings).toEqual([
      {
        message: 'Access certificate expires within 30 days. Plan renewal to avoid interruptions.',
        action: { label: 'Open Access Key Chain', route: ['/keys', 'due'] },
      },
    ]);
  });

  it.each([
    // An access key chain without a certificate comes first; the expired one needs the link.
    ['an expired certificate', [{ id: 'nocert', usageType: 'access' }, accessKeyChain(-1, 'due')]],
    ['no certificate', [{ id: 'due', usageType: 'access' }]],
  ])('sends the setup guide to the access key chain with %s', async (_, keyChains) => {
    roles = ['issuance:manage'];
    Object.assign(responses, issuanceSetUp, { '/api/key-chain': keyChains });

    await service.getCounters();

    expect(service.showSetupGuide).toBe(true);
    expect(service.accessCertificateRoute).toEqual(['/keys', 'due']);
    expect(service.warnings).toEqual([]);
  });

  it('names a failed issuance request as the reason issuance is blocked', async () => {
    roles = ['issuance:manage'];
    Object.assign(responses, issuanceSetUp);
    delete responses['/api/issuer/credentials'];
    failures['/api/issuer/credentials'] = 500;

    await service.getCounters();

    expect(service.issueReadinessReason).toBe('Credential configs could not be loaded');
    expect(service.showSetupGuide).toBe(false);

    delete failures['/api/issuer/credentials'];
    responses['/api/issuer/credentials'] = [{ id: 'pid' }];
    delete responses['/api/issuer/config'];
    failures['/api/issuer/config'] = 500;
    await service.getCounters();

    expect(service.issueReadinessReason).toBe('Issuer settings could not be loaded');
  });

  it('names failed presentation configs to presentation:request users', async () => {
    roles = ['presentation:request'];
    failures['/api/verifier/config'] = 500;

    await service.getCounters();

    expect(service.isReadyToVerify).toBe(false);
    expect(service.verifyReadinessReason).toBe('Presentation configs could not be loaded');
  });

  it('does not report a missing trust list when the trust lists failed to load', async () => {
    roles = ['presentation:manage'];
    responses['/api/key-chain'] = [accessKeyChain(365)];
    responses['/api/verifier/config'] = [{ id: 'pid' }];
    failures['/api/trust-list'] = 500;

    await service.getCounters();

    expect(messages()).toEqual(['Could not load trust lists.']);
  });

  it('explains why an issuance:offer-only user cannot start an issuance here', async () => {
    roles = ['issuance:offer'];

    await service.getCounters();

    expect(service.issueReadinessReason).toBe('The issuance form needs the issuance:manage role');
  });

  it('lets presentation:request users start a presentation once a config exists', async () => {
    roles = ['presentation:request'];
    responses['/api/verifier/config'] = [{ id: 'pid' }];

    await service.getCounters();

    expect(service.presentationConfigs).toBe(1);
    expect(service.isReadyToVerify).toBe(true);
    expect(service.verifyReadinessReason).toBeNull();
    expect(requests).not.toContain('/api/trust-list');
  });

  it('names the missing presentation config to presentation:request users', async () => {
    roles = ['presentation:request'];
    responses['/api/verifier/config'] = [];

    await service.getCounters();

    expect(service.isReadyToVerify).toBe(false);
    expect(service.verifyReadinessReason).toBe(
      'No presentation config; ask a user with presentation:manage to create one'
    );
  });

  it('keeps the setup guide while the issuance a manager owns is not set up', async () => {
    roles = ['issuance:manage', 'presentation:request'];
    responses['/api/key-chain'] = [accessKeyChain(365)];
    responses['/api/issuer/credentials'] = [];
    responses['/api/issuer/config'] = { id: 'config' };
    responses['/api/verifier/config'] = [{ id: 'pid' }];

    await service.getCounters();

    expect(service.isReadyToVerify).toBe(true);
    expect(service.isReadyToIssue).toBe(false);
    expect(service.isSetupComplete).toBe(false);
    expect(service.showSetupGuide).toBe(true);
  });

  it('keeps the previous values while refreshing, but not on a first load', async () => {
    roles = ['issuance:manage'];
    Object.assign(responses, issuanceSetUp);
    await service.getCounters();
    expect(service.credentialConfigs).toBe(1);

    let release: () => void = () => undefined;
    responses['/api/issuer/credentials'] = [{ id: 'pid' }, { id: 'mdl' }];
    const gate = new Promise<void>((resolve) => (release = resolve));
    const fetchImpl = client.getConfig().fetch!;
    client.setConfig({
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        await gate;
        return fetchImpl(input, init);
      },
    });

    const refresh = service.getCounters({ keepPrevious: true });
    expect(service.isLoading).toBe(true);
    expect(service.credentialConfigs).toBe(1);
    expect(service.isLoaded('credentials')).toBe(true);
    release();
    await refresh;
    expect(service.credentialConfigs).toBe(2);

    const firstLoad = service.getCounters();
    expect(service.isLoaded('credentials')).toBe(false);
    expect(service.hasLoaded).toBe(false);
    await firstLoad;
  });

  it('applies only the newest of two overlapping loads', async () => {
    roles = ['issuance:manage'];
    Object.assign(responses, issuanceSetUp);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const fetchImpl = client.getConfig().fetch!;
    client.setConfig({
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        await gate;
        return fetchImpl(input, init);
      },
    });
    const older = service.getCounters();

    client.setConfig({ fetch: fetchImpl });
    responses['/api/issuer/credentials'] = [{ id: 'pid' }, { id: 'mdl' }];
    await service.getCounters();
    expect(service.credentialConfigs).toBe(2);

    responses['/api/issuer/credentials'] = [];
    release();
    await older;

    expect(service.credentialConfigs).toBe(2);
    expect(service.isLoading).toBe(false);
  });

  it('treats a response of an unexpected shape as failed and still loads the rest', async () => {
    roles = ['issuance:manage'];
    Object.assign(responses, issuanceSetUp, { '/api/key-chain': { unexpected: true } });

    await service.getCounters();

    expect(service.hasFailed('keyChains')).toBe(true);
    expect(service.isLoaded('credentials')).toBe(true);
    expect(service.isLoading).toBe(false);
  });
});
