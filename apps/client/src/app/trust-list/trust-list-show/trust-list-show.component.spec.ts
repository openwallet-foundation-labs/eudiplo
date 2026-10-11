import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { client } from '@eudiplo/sdk-core';
import { vi } from 'vitest';

import { ApiService } from '../../core';
import { CredentialConfigService } from '../../issuance/credential-config/credential-config.service';
import { FrontendConfigService } from '../../services/frontend-config.service';
import { JwtService, type Role } from '../../services/jwt.service';
import { TrustListShowComponent } from './trust-list-show.component';

/** Answers the trust list requests of the page with this list and no versions. */
function serveTrustList(trustList: object): void {
  client.setConfig({
    fetch: async (request: RequestInfo | URL) => {
      const path = new URL(request instanceof Request ? request.url : String(request)).pathname;
      const body = path.endsWith('/versions') ? [] : trustList;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
}

describe('TrustListShowComponent', () => {
  let component: TrustListShowComponent;
  let fixture: ComponentFixture<TrustListShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustListShowComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TrustListShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('TrustListShowComponent public URL', () => {
  const trustList = {
    id: 'membership-issuers',
    tenantId: 'membership-demo',
    description: 'Issuers accepted for membership checks',
    entityConfig: [],
  };

  async function render(publicUrl: string | undefined) {
    serveTrustList(trustList);
    await TestBed.configureTestingModule({
      imports: [TrustListShowComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: trustList.id }) } },
        },
        // The admin signed in with the Compose-internal address.
        { provide: ApiService, useValue: { getBaseUrl: () => 'http://eudiplo:3000' } },
        {
          provide: FrontendConfigService,
          useValue: { getConfig: async () => ({ configImportMode: 'disabled', publicUrl }) },
        },
        { provide: CredentialConfigService, useValue: { loadConfigurations: async () => [] } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TrustListShowComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.publicUrl).not.toBe(''));
    fixture.detectChanges();
    return fixture;
  }

  function shownUrl(fixture: ComponentFixture<TrustListShowComponent>): string | undefined {
    const element = fixture.nativeElement as HTMLElement;
    return element.querySelector<HTMLInputElement>('.public-url-section input')?.value;
  }

  afterEach(() => {
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
  });

  it('shows the URL under the public URL of the backend, not the instance URL', async () => {
    const fixture = await render('https://eudiplo.example.com');

    expect(shownUrl(fixture)).toBe(
      'https://eudiplo.example.com/issuers/membership-demo/trust-list/membership-issuers'
    );
    expect(fixture.nativeElement.textContent).not.toContain('did not report its public URL');
  });

  it('falls back to the instance URL with a warning when the backend reports no public URL', async () => {
    const fixture = await render(undefined);

    expect(shownUrl(fixture)).toBe(
      'http://eudiplo:3000/issuers/membership-demo/trust-list/membership-issuers'
    );
    expect(fixture.nativeElement.textContent).toContain('did not report its public URL');
  });
});

describe('TrustListShowComponent references', () => {
  const trustList = { id: 'membership-issuers', tenantId: 'membership-demo', entityConfig: [] };
  const referencing = {
    id: 'membership',
    description: 'Membership card',
    schemaMeta: { trustedAuthorities: [{ frameworkType: 'etsi_tl', value: trustList.id }] },
  };
  const unrelated = { id: 'pid', description: 'PID', schemaMeta: { trustedAuthorities: [] } };

  async function render(roles: Role[], loadConfigurations: () => Promise<unknown[]>) {
    serveTrustList(trustList);
    const load = vi.fn(loadConfigurations);
    await TestBed.configureTestingModule({
      imports: [TrustListShowComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: trustList.id }) } },
        },
        { provide: ApiService, useValue: { getBaseUrl: () => undefined } },
        { provide: FrontendConfigService, useValue: { getConfig: async () => undefined } },
        { provide: CredentialConfigService, useValue: { loadConfigurations: load } },
        {
          provide: JwtService,
          useValue: {
            hasRole: (role: Role | Role[]) => [role].flat().some((r) => roles.includes(r)),
            canUseConfigPortability: () => false,
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TrustListShowComponent);
    fixture.detectChanges();
    return { fixture, load };
  }

  /** Text of the card that lists the credential configs using the list, once it shows `expected`. */
  async function referencesCard(
    fixture: ComponentFixture<TrustListShowComponent>,
    expected: string
  ): Promise<string> {
    let text = '';
    await vi.waitFor(() => {
      fixture.detectChanges();
      const cards = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-card'));
      const card = cards.find((c) =>
        c.querySelector('mat-card-title')?.textContent?.includes('Referenced by')
      );
      text = card?.textContent ?? '';
      expect(text).toContain(expected);
    });
    return text;
  }

  afterEach(() => {
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
  });

  it('lists the credential configs that reference the list', async () => {
    const { fixture } = await render(['issuance:manage'], async () => [referencing, unrelated]);

    const text = await referencesCard(fixture, 'Membership card');
    expect(text).not.toContain('PID');
  });

  // GET /api/issuer/credentials needs issuance:manage; "none" would invite deleting a used list.
  it('tells verifier admins that they cannot see the references', async () => {
    const { fixture, load } = await render(['presentation:manage'], async () => [referencing]);

    const text = await referencesCard(fixture, 'You need the issuance:manage role');
    expect(text).not.toContain('No credential configs');
    expect(load).not.toHaveBeenCalled();
  });

  it('says it is loading instead of claiming that no config uses the list', async () => {
    const { fixture } = await render(['issuance:manage'], () => new Promise(() => undefined));

    const text = await referencesCard(fixture, 'Loading credential configs');
    expect(text).not.toContain('No credential configs');
    // <output> is a status live region, so screen readers announce the loading state.
    const output = (fixture.nativeElement as HTMLElement).querySelector('output');
    expect(output?.textContent?.trim()).toBe('Loading credential configs…');
  });

  it('reports a failed load instead of claiming that no config uses the list', async () => {
    const { fixture } = await render(['issuance:manage'], async () => {
      throw new Error('503');
    });

    const text = await referencesCard(fixture, 'Could not load the credential configs');
    expect(text).not.toContain('No credential configs');
  });
});
