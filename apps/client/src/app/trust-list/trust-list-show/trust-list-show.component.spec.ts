import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { client } from '@eudiplo/sdk-core';
import { vi } from 'vitest';

import { ApiService } from '../../core';
import { CredentialConfigService } from '../../issuance/credential-config/credential-config.service';
import { PresentationManagementService } from '../../presentation/presentation-config/presentation-management.service';
import { FrontendConfigService } from '../../services/frontend-config.service';
import { JwtService, type Role } from '../../services/jwt.service';
import { TrustListService } from '../trust-list.service';
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
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('button[mattooltip="Copy URL"]')
        ?.getAttribute('aria-label')
    ).toBe('Copy URL');
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
  const trustList = {
    id: 'membership-issuers',
    tenantId: 'membership-demo',
    description: 'Membership issuers',
    entityConfig: [],
  };
  // Names the list by trustListId, as the schema form writes it.
  const referencing = {
    id: 'membership',
    description: 'Membership card',
    schemaMeta: { trustedAuthorities: [{ trustListId: trustList.id }] },
  };
  const unrelated = { id: 'pid', description: 'PID', schemaMeta: { trustedAuthorities: [] } };
  // Another list whose id starts with the id of this one.
  const otherListCard = {
    id: 'legacy-card',
    description: 'Legacy card',
    schemaMeta: {
      trustedAuthorities: [
        { frameworkType: 'etsi_tl', value: `<TENANT_URL>/trust-list/${trustList.id}-old` },
      ],
    },
  };

  /** A presentation config whose only credential query accepts issuers from these lists. */
  function presentationConfig(id: string, description: string, refs: object[]) {
    return {
      id,
      description,
      dcql_query: {
        credentials: [
          {
            id: 'card',
            format: 'dc+sd-jwt',
            meta: { vct_values: ['urn:membership'] },
            trusted_authorities: [{ type: 'etsi_tl', values: refs }],
          },
        ],
      },
    };
  }
  const checkById = presentationConfig('door-check', 'Door check', [{ trustListId: trustList.id }]);
  const checkByUrl = presentationConfig('age-check', 'Age check', [
    { url: `<TENANT_URL>/trust-list/${trustList.id}` },
  ]);
  // Another list whose id starts with the id of this one.
  const checkOtherList = presentationConfig('legacy-check', 'Legacy check', [
    { url: `https://eudiplo.example.com/issuers/membership-demo/trust-list/${trustList.id}-old` },
  ]);

  async function render(
    roles: Role[],
    loaders: {
      credentialConfigs?: () => Promise<unknown[]>;
      presentationConfigs?: () => Promise<unknown[]>;
    } = {}
  ) {
    serveTrustList(trustList);
    const load = vi.fn(loaders.credentialConfigs ?? (async () => []));
    const loadPresentations = vi.fn(loaders.presentationConfigs ?? (async () => []));
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
          provide: PresentationManagementService,
          useValue: { loadConfigurations: loadPresentations },
        },
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
    return { fixture, load, loadPresentations };
  }

  /** The card with this title, once its text contains `expected`. */
  async function referencesCard(
    fixture: ComponentFixture<TrustListShowComponent>,
    expected: string,
    title = 'Referenced by Credential Configs'
  ): Promise<Element> {
    let card: Element | undefined;
    await vi.waitFor(() => {
      fixture.detectChanges();
      const cards = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-card'));
      card = cards.find((c) => c.querySelector('mat-card-title')?.textContent?.trim() === title);
      expect(card?.textContent).toContain(expected);
    });
    return card!;
  }

  async function referencesText(
    fixture: ComponentFixture<TrustListShowComponent>,
    expected: string,
    title?: string
  ): Promise<string> {
    return (await referencesCard(fixture, expected, title)).textContent ?? '';
  }

  const presentationsTitle = 'Referenced by Presentation Configs';

  afterEach(() => {
    vi.restoreAllMocks();
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
  });

  it('lists the credential configs that reference the list', async () => {
    const { fixture } = await render(['issuance:manage'], {
      credentialConfigs: async () => [referencing, unrelated, otherListCard],
    });

    const card = await referencesCard(fixture, 'Membership card');
    expect(card.textContent).not.toContain('PID');
    expect(card.textContent).not.toContain('Legacy card');
    const link = card.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/credential-config/membership');
    expect(link?.getAttribute('aria-label')).toBe('Open credential config Membership card');
  });

  // GET /api/issuer/credentials needs issuance:manage; "none" would invite deleting a used list.
  it('tells verifier admins that they cannot see the credential config references', async () => {
    const { fixture, load } = await render(['presentation:manage'], {
      credentialConfigs: async () => [referencing],
    });

    const text = await referencesText(fixture, 'You need the issuance:manage role');
    expect(text).not.toContain('No credential configs');
    expect(load).not.toHaveBeenCalled();
  });

  it('says it is loading instead of claiming that no config uses the list', async () => {
    const { fixture } = await render(['issuance:manage'], {
      credentialConfigs: () => new Promise(() => undefined),
    });

    const text = await referencesText(fixture, 'Loading credential configs');
    expect(text).not.toContain('No credential configs');
    // <output> is a status live region, so screen readers announce the loading state.
    const output = (fixture.nativeElement as HTMLElement).querySelector('output');
    expect(output?.textContent?.trim()).toBe('Loading credential configs…');
  });

  it('reports a failed load instead of claiming that no config uses the list', async () => {
    const { fixture } = await render(['issuance:manage'], {
      credentialConfigs: async () => {
        throw new Error('503');
      },
    });

    const text = await referencesText(fixture, 'Could not load the credential configs');
    expect(text).not.toContain('No credential configs');
  });

  it('lists and links the presentation configs that accept issuers from the list', async () => {
    const { fixture } = await render(['presentation:manage'], {
      presentationConfigs: async () => [checkById, checkByUrl, checkOtherList],
    });

    const card = await referencesCard(fixture, 'Door check', presentationsTitle);
    expect(card.textContent).toContain('Age check');
    expect(card.textContent).not.toContain('Legacy check');
    const links = Array.from(card.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/presentation-config/door-check', '/presentation-config/age-check']);
    expect(card.querySelector('a')?.getAttribute('aria-label')).toBe(
      'Open presentation config Door check'
    );
  });

  it('says that no presentation config references the list', async () => {
    const { fixture } = await render(['presentation:manage'], {
      presentationConfigs: async () => [checkOtherList],
    });

    const text = await referencesText(
      fixture,
      'No presentation configs reference this trust list.',
      presentationsTitle
    );
    expect(text).not.toContain('Legacy check');
  });

  // GET /api/verifier/config also admits presentation:request.
  it('reads the presentation configs with presentation:request', async () => {
    const { fixture, loadPresentations } = await render(
      ['issuance:manage', 'presentation:request'],
      {
        presentationConfigs: async () => [checkById],
      }
    );

    await referencesCard(fixture, 'Door check', presentationsTitle);
    expect(loadPresentations).toHaveBeenCalledOnce();
  });

  it('tells issuer admins that they cannot see the presentation config references', async () => {
    const { fixture, loadPresentations } = await render(['issuance:manage'], {
      presentationConfigs: async () => [checkById],
    });

    const text = await referencesText(
      fixture,
      'You need the presentation:manage or presentation:request role',
      presentationsTitle
    );
    expect(text).not.toContain('No presentation configs');
    expect(loadPresentations).not.toHaveBeenCalled();
  });

  it('says it is loading the presentation configs instead of claiming that none uses the list', async () => {
    const { fixture } = await render(['presentation:manage'], {
      presentationConfigs: () => new Promise(() => undefined),
    });

    const card = await referencesCard(fixture, 'Loading presentation configs', presentationsTitle);
    expect(card.textContent).not.toContain('No presentation configs');
    expect(card.querySelector('output')?.textContent?.trim()).toBe('Loading presentation configs…');
  });

  it('reports a failed presentation config load instead of claiming that none uses the list', async () => {
    const { fixture } = await render(['presentation:manage'], {
      presentationConfigs: async () => {
        throw new Error('503');
      },
    });

    const card = await referencesCard(
      fixture,
      'Could not load the presentation configs',
      presentationsTitle
    );
    expect(card.textContent).not.toContain('No presentation configs');
    expect(card.querySelector('[role="alert"]')).not.toBeNull();
  });

  describe('delete question', () => {
    function askedQuestion(fixture: ComponentFixture<TrustListShowComponent>): string {
      const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
      fixture.componentInstance.delete();
      expect(confirm).toHaveBeenCalledOnce();
      return confirm.mock.calls[0][0] as string;
    }

    it('names the configs that still reference the list', async () => {
      const { fixture } = await render(['issuance:manage', 'presentation:manage'], {
        credentialConfigs: async () => [referencing, unrelated],
        presentationConfigs: async () => [checkById, checkByUrl],
      });
      await referencesCard(fixture, 'Age check', presentationsTitle);
      await referencesCard(fixture, 'Membership card');

      expect(askedQuestion(fixture)).toBe(
        'Delete trust list "Membership issuers"? 1 credential config and 2 presentation configs' +
          ' still reference it and would then point to a missing trust list. This cannot be undone.'
      );
    });

    it('says which role the references it could not check need', async () => {
      const { fixture } = await render(['presentation:manage'], {
        presentationConfigs: async () => [checkById],
      });
      await referencesCard(fixture, 'Door check', presentationsTitle);

      expect(askedQuestion(fixture)).toBe(
        'Delete trust list "Membership issuers"? 1 presentation config still references it and' +
          ' would then point to a missing trust list.' +
          ' Checking credential config references needs the issuance:manage role.' +
          ' This cannot be undone.'
      );
    });

    it('counts a failed load as not loaded, not as unused', async () => {
      const { fixture } = await render(['issuance:manage', 'presentation:manage'], {
        presentationConfigs: async () => {
          throw new Error('503');
        },
      });
      await referencesCard(fixture, 'Could not load the presentation configs', presentationsTitle);
      await referencesCard(fixture, 'No credential configs');

      expect(askedQuestion(fixture)).toBe(
        'Delete trust list "Membership issuers"?' +
          ' References from presentation configs could not be loaded. This cannot be undone.'
      );
    });

    it('names a list without description by its id and joins kinds in the same state', async () => {
      const { fixture } = await render(['issuance:manage', 'presentation:manage'], {
        credentialConfigs: async () => {
          throw new Error('503');
        },
        presentationConfigs: async () => {
          throw new Error('503');
        },
      });
      await referencesCard(fixture, 'Could not load the presentation configs', presentationsTitle);
      await referencesCard(fixture, 'Could not load the credential configs');
      fixture.componentInstance.trustList!.description = undefined;

      expect(askedQuestion(fixture)).toBe(
        'Delete trust list "membership-issuers"? References from credential configs and' +
          ' presentation configs could not be loaded. This cannot be undone.'
      );
    });

    // Delete works before the references have loaded; "no references" would be a false all-clear.
    it('says which references are still loading', async () => {
      const { fixture } = await render(['issuance:manage', 'presentation:manage'], {
        presentationConfigs: () => new Promise(() => undefined),
      });
      await referencesCard(fixture, 'Loading presentation configs', presentationsTitle);
      await referencesCard(fixture, 'No credential configs');

      expect(askedQuestion(fixture)).toBe(
        'Delete trust list "Membership issuers"?' +
          ' References from presentation configs are still loading. This cannot be undone.'
      );
    });
  });
});

describe('TrustListShowComponent download', () => {
  const trustList = {
    id: 'membership-issuers',
    tenantId: 'membership-demo',
    description: 'Issuers accepted for membership checks',
    entityConfig: [],
  };

  async function render(downloadConfig: TrustListService['downloadConfig']) {
    serveTrustList(trustList);
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
        { provide: CredentialConfigService, useValue: { loadConfigurations: async () => [] } },
        { provide: TrustListService, useValue: { downloadConfig } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TrustListShowComponent);
    fixture.detectChanges();
    let button: HTMLButtonElement | null = null;
    await vi.waitFor(() => {
      fixture.detectChanges();
      button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        'button[aria-label="Download configuration"]'
      );
      expect(button).not.toBeNull();
    });
    return button as unknown as HTMLButtonElement;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
  });

  it('names the header actions like their tooltips', async () => {
    const button = await render(vi.fn());
    const header = button.parentElement as HTMLElement;

    expect([...header.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))).toEqual(
      ['Back to list', 'Edit list', 'Download configuration', 'Delete list']
    );
  });

  it('downloads the configuration of the list', async () => {
    const downloadConfig = vi.fn().mockResolvedValue(undefined);
    const button = await render(downloadConfig);
    // The component's own MatSnackBarModule provides its instance, not the root injector.
    const open = vi.spyOn(MatSnackBar.prototype, 'open');

    button.click();

    await vi.waitFor(() =>
      expect(open).toHaveBeenCalledWith('Trust list configuration downloaded', 'Close', {
        duration: 3000,
      })
    );
    expect(downloadConfig).toHaveBeenCalledWith(trustList.id);
  });

  it('says why the configuration could not be downloaded', async () => {
    const downloadConfig = vi
      .fn()
      .mockRejectedValue({ statusCode: 404, message: 'Trust list membership-issuers not found' });
    const button = await render(downloadConfig);
    const open = vi.spyOn(MatSnackBar.prototype, 'open');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    button.click();

    await vi.waitFor(() =>
      expect(open).toHaveBeenCalledWith(
        'Failed to download configuration: Trust list membership-issuers not found',
        'Close',
        expect.objectContaining({ duration: expect.any(Number) })
      )
    );
    expect(downloadConfig).toHaveBeenCalledWith(trustList.id);
  });
});
