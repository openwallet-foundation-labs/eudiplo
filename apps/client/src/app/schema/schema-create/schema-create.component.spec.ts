import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MatSelectHarness } from '@angular/material/select/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('SchemaCreateComponent template', () => {
  it('lets the user clear a selected category', async () => {
    const pending = () => new Promise<never>(() => undefined);
    TestBed.configureTestingModule({
      imports: [SchemaCreateComponent],
      providers: [
        provideRouter([]),
        { provide: SchemaService, useValue: { getVocabularies: pending } },
        { provide: CredentialConfigService, useValue: { loadConfigurations: pending } },
      ],
    });
    const fixture = TestBed.createComponent(SchemaCreateComponent);
    const component = fixture.componentInstance;
    component.categoryVocabularies = [{ code: 'identity', label: 'Identity' } as any];
    fixture.detectChanges();
    component.composeForm.patchValue({ category: 'identity' });

    const select = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatSelectHarness.with({ selector: '[formControlName="category"]' })
    );
    await select.open();
    const [none] = await select.getOptions();
    expect(await none.getText()).toBe('— None —');
    await none.click();

    expect(component.composeForm.value.category).toBe('');
  });
});
