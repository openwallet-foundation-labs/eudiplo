import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CredentialConfigService } from '../../issuance/credential-config/credential-config.service';
import { SchemaService } from '../schema.service';
import { SchemaShowComponent } from './schema-show.component';

const catalogId = 'https://registrar.example/schema-metadata/schema-1';

function currentVersion(overrides: Record<string, unknown> = {}) {
  const payload = btoa(JSON.stringify({ id: catalogId }));
  return {
    id: 'schema-1',
    version: '1.0.0',
    displayName: 'German PID',
    rulebookURI: 'https://rules.example/pid.md',
    attestationLoS: 'iso_18045_high',
    bindingType: 'key',
    category: 'identity',
    // The registrar returns tags as free-form strings.
    tags: ['pid', 'legacy-tag', 'eudi'],
    schemaURIs: [
      {
        id: 'schema-uri-1',
        formatIdentifier: 'dc+sd-jwt',
        uri: 'https://eudiplo.example/issuers/acme/schema/pid/dc+sd-jwt',
      },
    ],
    trustedAuthorities: [
      {
        id: 'authority-1',
        frameworkType: 'etsi_tl',
        value: 'https://eudiplo.example/issuers/acme/trust-list/tl-1',
      },
    ],
    signedJwt: `eyJhbGciOiJFUzI1NiJ9.${payload}.signature`,
    ...overrides,
  };
}

describe('SchemaShowComponent publishing a new version', () => {
  let component: SchemaShowComponent;
  let schemaService: Record<string, ReturnType<typeof vi.fn>>;
  let credentialConfigs: unknown[];
  let openSnackBar: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  async function load(item = currentVersion()) {
    schemaService['getById'].mockResolvedValue(item);
    component.id = 'schema-1';
    await component.load();
  }

  function publishedConfig() {
    expect(schemaService['publishSchemaMetadataVersion']).toHaveBeenCalledOnce();
    return schemaService['publishSchemaMetadataVersion'].mock.calls[0][0];
  }

  beforeEach(() => {
    schemaService = {
      getById: vi.fn(),
      getVersions: vi.fn().mockResolvedValue([{ version: '1.0.0' }]),
      getVocabularies: vi.fn().mockResolvedValue({
        version: '1',
        categories: [{ code: 'identity', label: 'Identity', status: 'active' }],
        tags: [
          { code: 'pid', label: 'PID', status: 'active' },
          { code: 'eudi', label: 'EUDI', status: 'active' },
        ],
      }),
      list: vi.fn(),
      publishSchemaMetadataVersion: vi.fn().mockResolvedValue({ id: 'schema-1', version: '1.1.0' }),
      deprecateVersion: vi.fn().mockResolvedValue({}),
    };
    credentialConfigs = [{ id: 'pid', vct: 'urn:eudi:pid:1', config: { format: 'dc+sd-jwt' } }];
    openSnackBar = vi.fn();
    navigate = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: SchemaService, useValue: schemaService },
        {
          provide: CredentialConfigService,
          useValue: { loadConfigurations: async () => credentialConfigs },
        },
        { provide: MatSnackBar, useValue: { open: openSnackBar } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new SchemaShowComponent());
  });

  it('keeps the display name, category and tags of the current version', async () => {
    await load();

    await component.publishNewVersion();

    const config = publishedConfig();
    expect(config).toMatchObject({
      id: catalogId,
      name: 'German PID',
      version: '1.1.0',
      rulebookURI: 'https://rules.example/pid.md',
      category: 'identity',
      tags: ['pid', 'eudi'],
    });
    expect(schemaService['deprecateVersion']).toHaveBeenCalledWith('schema-1', '1.0.0', {
      deprecated: true,
      message: 'Superseded by version 1.1.0',
      supersededByVersion: '1.1.0',
    });
    expect(navigate).toHaveBeenCalledWith(['/schema', 'schema-1'], {
      queryParams: { version: '1.1.0' },
    });
  });

  it('reports tags outside the vocabulary that it leaves out', async () => {
    await load();

    await component.publishNewVersion();

    const [message, , options] = openSnackBar.mock.calls[0];
    expect(message).toContain('Version 1.1.0 published successfully.');
    expect(message).toContain('not carried over: legacy-tag');
    expect(options).toEqual({ duration: 10000 });
  });

  it('leaves out and reports a category outside the vocabulary', async () => {
    await load(currentVersion({ category: 'health' }));

    expect(component.notCarriedOverNote).toContain('not carried over: health, legacy-tag.');
    await component.publishNewVersion();

    expect(publishedConfig()).not.toHaveProperty('category');
    expect(openSnackBar.mock.calls[0][0]).toContain('not carried over: health, legacy-tag');
  });

  it('neither deprecates nor navigates when the publish is rejected', async () => {
    schemaService['publishSchemaMetadataVersion'].mockRejectedValue({
      statusCode: 400,
      message: 'Validation failed',
      errors: [{ path: ['config', 'tags', 0], message: 'Invalid option', code: 'invalid_value' }],
    });
    await load();

    await component.publishNewVersion();

    expect(schemaService['deprecateVersion']).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(openSnackBar).toHaveBeenCalledWith(
      'Failed to publish new version: Validation failed (config.tags.0: Invalid option)',
      'Close',
      { duration: 6000 }
    );
    expect(component.publishing).toBe(false);
  });

  it('keeps the current version when "Deprecate current version" is unticked', async () => {
    await load(currentVersion({ tags: ['pid'] }));
    component.publishForm.controls.deprecateCurrent.setValue(false);

    await component.publishNewVersion();

    expect(schemaService['deprecateVersion']).not.toHaveBeenCalled();
    expect(openSnackBar).toHaveBeenCalledWith('Version 1.1.0 published successfully.', 'Close', {
      duration: 4000,
    });
  });

  it('names the rejected field when saving catalog metadata fails', async () => {
    schemaService['updateMetadata'] = vi.fn().mockRejectedValue({
      statusCode: 400,
      message: 'Validation failed',
      errors: [{ path: ['category'], message: 'Invalid option', code: 'invalid_value' }],
    });
    await load();

    await component.saveMetadata();

    expect(openSnackBar).toHaveBeenCalledWith(
      'Failed to update metadata: Validation failed (category: Invalid option)',
      'Close',
      { duration: 6000 }
    );
  });

  it('saves only the catalog metadata fields that were changed', async () => {
    schemaService['updateMetadata'] = vi.fn().mockResolvedValue(currentVersion());
    await load();

    component.metadataForm.controls.displayName.setValue('Renamed PID');
    component.metadataForm.controls.displayName.markAsDirty();
    await component.saveMetadata();

    // legacy-tag has no option in the tag select, so sending the tags back would fail with 400.
    expect(schemaService['updateMetadata']).toHaveBeenCalledWith('schema-1', '1.0.0', {
      displayName: 'Renamed PID',
    });
  });

  it('treats the catalog metadata form as unchanged after loading a version', async () => {
    await load();
    component.metadataForm.markAsDirty();

    await load();

    expect(component.metadataForm.dirty).toBe(false);
  });

  it('carries over deprecated vocabulary codes, which stay valid', async () => {
    schemaService['getVocabularies'].mockResolvedValue({
      version: '1',
      categories: [{ code: 'identity', label: 'Identity', status: 'deprecated' }],
      tags: [
        { code: 'pid', label: 'PID', status: 'active' },
        { code: 'eudi', label: 'EUDI', status: 'deprecated', replacedBy: 'pid' },
      ],
    });
    await load();

    await component.publishNewVersion();

    expect(publishedConfig()).toMatchObject({ category: 'identity', tags: ['pid', 'eudi'] });
  });

  it('sends no category or tags when the current version has none', async () => {
    await load(currentVersion({ category: undefined, tags: undefined }));

    await component.publishNewVersion();

    const config = publishedConfig();
    expect(config).not.toHaveProperty('category');
    expect(config).not.toHaveProperty('tags');
    expect(openSnackBar).toHaveBeenCalledWith('Version 1.1.0 published successfully.', 'Close', {
      duration: 4000,
    });
  });

  it('uses the ID as name when the current version has no display name', async () => {
    await load(currentVersion({ displayName: undefined }));

    await component.publishNewVersion();

    expect(publishedConfig().name).toBe('schema-1');
  });

  it('reports a schema it cannot rebuild instead of failing silently', async () => {
    credentialConfigs = [];
    await load();

    await component.publishNewVersion();

    expect(schemaService['publishSchemaMetadataVersion']).not.toHaveBeenCalled();
    expect(openSnackBar).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to publish new version: Unable to derive schemaURIs metadata'
      ),
      'Close',
      { duration: 6000 }
    );
    expect(component.publishing).toBe(false);
  });

  it('reports a failed deprecation as such, not as a failed publish', async () => {
    schemaService['deprecateVersion'].mockRejectedValue({
      statusCode: 403,
      message: 'Forbidden resource',
    });
    await load();

    await component.publishNewVersion();

    const [message] = openSnackBar.mock.calls[0];
    expect(message).toContain('Version 1.1.0 published successfully.');
    expect(message).toContain('Failed to deprecate version 1.0.0: Forbidden resource.');
    expect(navigate).toHaveBeenCalledWith(['/schema', 'schema-1'], {
      queryParams: { version: '1.1.0' },
    });
  });
});

describe('SchemaShowComponent publish card', () => {
  async function render(item = currentVersion()) {
    const schemaService = {
      getById: vi.fn().mockResolvedValue(item),
      getVersions: vi.fn().mockResolvedValue([{ version: '1.0.0' }]),
      getVocabularies: vi.fn().mockResolvedValue({
        version: '1',
        categories: [{ code: 'identity', label: 'Identity', status: 'active' }],
        tags: [
          { code: 'pid', label: 'PID', status: 'active' },
          { code: 'eudi', label: 'EUDI', status: 'active' },
        ],
      }),
      updateMetadata: vi.fn().mockResolvedValue(currentVersion()),
    };
    TestBed.configureTestingModule({
      imports: [SchemaShowComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'schema-1' })),
            queryParamMap: of(convertToParamMap({})),
          },
        },
        { provide: SchemaService, useValue: schemaService },
        { provide: CredentialConfigService, useValue: { loadConfigurations: async () => [] } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(SchemaShowComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.item).toBeDefined());
    await vi.waitFor(() => expect(fixture.componentInstance.loading).toBe(false));
    fixture.componentInstance.togglePublishForm();
    fixture.detectChanges();
    return fixture;
  }

  function publishCardText(fixture: { nativeElement: HTMLElement }): string {
    return fixture.nativeElement.querySelector('mat-card-content p')?.textContent ?? '';
  }

  it('says what the new version keeps and leaves out before publishing', async () => {
    const fixture = await render();

    const text = publishCardText(fixture);
    expect(text).toContain('keeps the name, category and tags of version 1.0.0');
    expect(text).toContain('not carried over: legacy-tag');
    expect(text).not.toContain('Unsaved changes');
  });

  it('says the ID becomes the name when the current version has none', async () => {
    const fixture = await render(currentVersion({ displayName: '' }));

    expect(publishCardText(fixture)).toContain(
      'keeps the category and tags of version 1.0.0 and uses its ID as name'
    );
  });

  it('warns that unsaved catalog metadata is not included until it is saved', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;

    component.metadataForm.controls.displayName.setValue('Renamed PID');
    component.metadataForm.markAsDirty();
    fixture.detectChanges();
    expect(publishCardText(fixture)).toContain('Unsaved changes under Catalog Metadata');

    await component.saveMetadata();
    fixture.detectChanges();
    expect(publishCardText(fixture)).not.toContain('Unsaved changes');
  });
});
