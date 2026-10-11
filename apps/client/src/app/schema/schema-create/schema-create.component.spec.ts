import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { client } from '@eudiplo/sdk-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CredentialConfigService } from '../../issuance/credential-config/credential-config.service';
import { SchemaService } from '../schema.service';
import { SchemaCreateComponent } from './schema-create.component';

describe('SchemaCreateComponent', () => {
  let component: SchemaCreateComponent;
  let publishSchemaMetadata: ReturnType<typeof vi.fn>;
  let openSnackBar: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    publishSchemaMetadata = vi.fn().mockResolvedValue({ id: 'schema-1' });
    openSnackBar = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: new Map() } } },
      ],
    });
    component = TestBed.runInInjectionContext(
      () =>
        new SchemaCreateComponent(
          new FormBuilder(),
          { publishSchemaMetadata } as any,
          {} as any,
          { open: openSnackBar } as any
        )
    );

    component.credentialConfigs = [
      { id: 'pid', vct: 'urn:eudi:pid:1', config: { format: 'dc+sd-jwt' } } as any,
    ];
    component.importSchemaConfigIds.setValue(['pid']);
    component.syncSchemaURIsFromSelection();
    component.trustLists = [{ id: 'tl-1' } as any];
    component.importTrustListIds.setValue(['tl-1']);
    component.syncTrustedAuthoritiesFromSelection();
    component.composeForm.patchValue({
      name: 'German PID',
      version: '1.0.0',
      rulebookURI: 'https://rules.example/pid.md',
      attestationLoS: 'iso_18045_high',
      bindingType: 'key',
      category: 'identity',
      tags: ['pid', 'eudi'],
    });
  });

  it('publishes category and tags with the schema metadata config', async () => {
    await component.submit();

    expect(publishSchemaMetadata).toHaveBeenCalledOnce();
    const [config, , credentialConfigId] = publishSchemaMetadata.mock.calls[0];
    expect(config).toMatchObject({ category: 'identity', tags: ['pid', 'eudi'] });
    expect(credentialConfigId).toBe('pid');
  });

  it('shows the message of a rejected publish request', async () => {
    publishSchemaMetadata.mockRejectedValue({
      statusCode: 400,
      message: 'config.rulebookURI is required when publishing new schema metadata',
    });

    await component.submit();

    expect(openSnackBar).toHaveBeenCalledWith(
      'Failed to submit schema: config.rulebookURI is required when publishing new schema metadata',
      'Close',
      { duration: 5000 }
    );
    expect(component.loading).toBe(false);
  });
});

describe('SchemaCreateComponent loading its sources', () => {
  const pendingFetch = () => new Promise<Response>(() => undefined);
  let loadConfigurations: ReturnType<typeof vi.fn>;
  let getVocabularies: ReturnType<typeof vi.fn>;
  let openSnackBar: ReturnType<typeof vi.fn>;

  function respondToTrustLists(status: number, body: unknown) {
    client.setConfig({
      fetch: async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
    });
  }

  function createComponent() {
    return TestBed.runInInjectionContext(
      () =>
        new SchemaCreateComponent(
          new FormBuilder(),
          { getVocabularies } as any,
          { loadConfigurations } as any,
          { open: openSnackBar } as any
        )
    );
  }

  beforeEach(() => {
    loadConfigurations = vi
      .fn()
      .mockResolvedValue([{ id: 'pid', vct: 'urn:eudi:pid:1', config: { format: 'dc+sd-jwt' } }]);
    getVocabularies = vi.fn().mockResolvedValue({
      version: '1',
      categories: [{ code: 'identity', label: 'Identity', status: 'active' }],
      tags: [{ code: 'pid', label: 'PID', status: 'active' }],
    });
    openSnackBar = vi.fn();
    respondToTrustLists(200, [{ id: 'tl-1' }]);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });
  });

  afterEach(() => {
    client.setConfig({ fetch: pendingFetch });
  });

  it('keeps credential configs and trust lists when the registrar vocabularies fail', async () => {
    getVocabularies.mockRejectedValue({
      statusCode: 400,
      message: 'Registrar is not configured for this tenant',
    });
    const component = createComponent();
    component.credentialConfigId = 'pid';

    await component.loadData();

    expect(component.credentialConfigs.map((c) => c.id)).toEqual(['pid']);
    expect(component.importSchemaConfigIds.value).toEqual(['pid']);
    expect(component.schemaURIs.length).toBe(1);
    expect(component.trustLists.map((t) => t.id)).toEqual(['tl-1']);
    expect(component.loadState).toEqual({
      credentialConfigs: 'loaded',
      trustLists: 'loaded',
      vocabularies: 'failed',
    });
    expect(openSnackBar).toHaveBeenCalledWith(
      'Failed to load categories and tags from the registrar: Registrar is not configured for this tenant',
      'Close',
      { duration: 10000 }
    );
  });

  it('names every source that failed to load', async () => {
    loadConfigurations.mockRejectedValue({ statusCode: 403, message: 'Forbidden resource' });
    respondToTrustLists(403, { statusCode: 403, message: 'Forbidden resource' });
    const component = createComponent();

    await component.loadData();

    expect(component.categoryVocabularies.map((v) => v.code)).toEqual(['identity']);
    expect(component.loadState).toEqual({
      credentialConfigs: 'failed',
      trustLists: 'failed',
      vocabularies: 'loaded',
    });
    expect(openSnackBar).toHaveBeenCalledWith(
      'Failed to load credential configs: Forbidden resource; Failed to load trust lists: Forbidden resource',
      'Close',
      { duration: 10000 }
    );
  });

  it('names each source when the backend cannot be reached', async () => {
    loadConfigurations.mockRejectedValue(new TypeError('Failed to fetch'));
    getVocabularies.mockRejectedValue(new TypeError('Failed to fetch'));
    client.setConfig({
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      },
    });

    await createComponent().loadData();

    expect(openSnackBar).toHaveBeenCalledWith(
      'Failed to load credential configs: Failed to fetch; ' +
        'Failed to load trust lists: Failed to fetch; ' +
        'Failed to load categories and tags from the registrar: Failed to fetch',
      'Close',
      { duration: 10000 }
    );
  });

  it('shows no snackbar when every source loads', async () => {
    await createComponent().loadData();

    expect(openSnackBar).not.toHaveBeenCalled();
  });

  function createFixture() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SchemaCreateComponent],
      providers: [
        provideRouter([]),
        { provide: MatSnackBar, useValue: { open: openSnackBar } },
        { provide: SchemaService, useValue: { getVocabularies } },
        { provide: CredentialConfigService, useValue: { loadConfigurations } },
      ],
    });
    return TestBed.createComponent(SchemaCreateComponent);
  }

  /** Renders the form and returns its text once `ngOnInit` has loaded the sources. */
  async function render(): Promise<string> {
    const fixture = createFixture();
    const loadData = vi.spyOn(fixture.componentInstance, 'loadData');
    fixture.detectChanges();
    await loadData.mock.results[0].value;
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('says in the hints that sources are loading, and fills each in as it answers', async () => {
    const pending = () => new Promise<never>(() => undefined);
    getVocabularies.mockImplementation(pending);
    client.setConfig({ fetch: pendingFetch });
    const fixture = createFixture();

    fixture.detectChanges();
    let text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Loading credential configs…');
    expect(text).toContain('Loading trust lists…');
    expect(text).toContain('Loading categories…');
    expect(text).toContain('Loading tags…');
    expect(text).not.toContain('No credential configs available.');

    // The credential configs answer while the registrar and trust lists are still pending.
    await vi.waitFor(() =>
      expect(fixture.componentInstance.loadState.credentialConfigs).toBe('loaded')
    );
    fixture.detectChanges();
    text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Loading credential configs…');
    expect(fixture.componentInstance.credentialConfigs.map((c) => c.id)).toEqual(['pid']);
    expect(text).toContain('Loading tags…');
  });

  it('says in the hints that sources failed instead of claiming none exist', async () => {
    loadConfigurations.mockRejectedValue({ statusCode: 403, message: 'Forbidden resource' });
    respondToTrustLists(403, { statusCode: 403, message: 'Forbidden resource' });
    getVocabularies.mockRejectedValue({ statusCode: 503, message: 'Registrar unreachable' });

    const text = await render();

    expect(text).toContain('Could not load credential configs.');
    expect(text).toContain('Could not load trust lists.');
    expect(text).toContain('Could not load categories from the registrar.');
    expect(text).toContain('Could not load tags from the registrar.');
    expect(text).not.toContain('No credential configs available.');
    expect(text).not.toContain('No trust lists available.');
    expect(text).not.toContain('No predefined categories available.');
    expect(text).not.toContain('No predefined tags available.');
  });

  it('says in the hints that nothing exists when the sources load empty', async () => {
    loadConfigurations.mockResolvedValue([]);
    respondToTrustLists(200, []);
    getVocabularies.mockResolvedValue({ version: '1', categories: [], tags: [] });

    const text = await render();

    expect(text).toContain('No credential configs available.');
    expect(text).toContain('No trust lists available.');
    expect(text).toContain('No predefined categories available.');
    expect(text).toContain('No predefined tags available.');
    expect(text).not.toContain('Could not load');
    expect(openSnackBar).not.toHaveBeenCalled();
  });
});
