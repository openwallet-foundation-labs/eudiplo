import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtService } from '../services/jwt.service';
import { ConfigPortabilityComponent } from './config-portability.component';
import {
  ConfigBundle,
  ConfigImportPlan,
  ConfigPlanItem,
  ConfigPortabilityService,
  ConfigResourceMetadata,
} from './config-portability.service';
import { errorSnackBarDuration } from '../utils/error-snackbar';

/** The arguments of an error snackbar with this text. */
const errorSnackBar = (text: string) =>
  [text, 'Close', { duration: errorSnackBarDuration(text) }] as const;

describe('ConfigPortabilityComponent detaching selected resources', () => {
  let detach: ReturnType<typeof vi.fn>;
  let listResources: ReturnType<typeof vi.fn>;
  let openSnackBar: ReturnType<typeof vi.fn>;
  let component: ConfigPortabilityComponent;

  function resource(kind: string, resourceId: string): ConfigResourceMetadata {
    return { kind, resourceId } as ConfigResourceMetadata;
  }

  beforeEach(() => {
    detach = vi.fn();
    openSnackBar = vi.fn();
    const resources = [
      resource('CredentialConfig', 'pid'),
      resource('TrustList', 'tl-1'),
      resource('WebhookEndpoint', 'hook'),
    ];
    listResources = vi.fn(async () => resources);
    component = new ConfigPortabilityComponent(
      { detach, listResources } as unknown as ConfigPortabilityService,
      { open: openSnackBar } as unknown as MatSnackBar,
      { hasRole: () => true } as unknown as JwtService
    );
    component.resources = resources;
    for (const { kind, resourceId } of resources) component.selected.add(`${kind}/${resourceId}`);
    vi.stubGlobal('confirm', () => true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gives only the reason when the backend answered none of the requests', async () => {
    detach.mockRejectedValue(new TypeError('Failed to fetch'));
    // Reloading the list fails too; the summary replaces its snackbar.
    listResources.mockRejectedValue(new TypeError('Failed to fetch'));

    await component.detachSelected();

    expect(openSnackBar).toHaveBeenLastCalledWith(
      ...errorSnackBar(
        'Detached 0 of 3 resource(s): the backend could not be reached. ' +
          'Check the connection and try again.'
      )
    );
    expect(component.selected.size).toBe(3);
  });

  it("keeps the backend's reason per resource and gives the unreachable hint once, last", async () => {
    detach
      .mockRejectedValueOnce({ statusCode: 404, message: 'Resource not found' })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(resource('WebhookEndpoint', 'hook'));

    await component.detachSelected();

    expect(openSnackBar).toHaveBeenCalledWith(
      ...errorSnackBar(
        'Detached 1 of 3 resource(s). Failed: CredentialConfig/pid: Resource not found; ' +
          'TrustList/tl-1: the backend could not be reached. Check the connection and try again.'
      )
    );
    expect([...component.selected]).toEqual(['CredentialConfig/pid', 'TrustList/tl-1']);
  });

  it('gives the reason of each resource the backend rejected, without the unreachable hint', async () => {
    detach
      .mockRejectedValueOnce({ statusCode: 404, message: 'Resource not found' })
      // A body without a message, as from a proxy.
      .mockRejectedValueOnce({ statusCode: 502 })
      .mockResolvedValueOnce(resource('WebhookEndpoint', 'hook'));

    await component.detachSelected();

    expect(openSnackBar).toHaveBeenCalledWith(
      ...errorSnackBar(
        'Detached 1 of 3 resource(s). Failed: CredentialConfig/pid: Resource not found; ' +
          'TrustList/tl-1: failed'
      )
    );
  });
});

describe('ConfigPortabilityComponent import plan', () => {
  const bundle = {
    manifest: { format: 'eudiplo.config-bundle' },
    documents: [],
  } as unknown as ConfigBundle;

  /** A plan item for the registrar configuration with these field changes. */
  const registrarUpdate = (changes: ConfigPlanItem['changes']): ConfigPlanItem => ({
    kind: 'RegistrarConfig',
    id: 'registrar',
    action: 'update',
    sourceVersion: 'v1',
    targetVersion: 'v1',
    migrations: [],
    issues: [],
    changes,
  });

  const planWith = (...items: ConfigPlanItem[]): ConfigImportPlan => ({
    tenantId: 'acme',
    mode: 'upsert',
    applicable: true,
    planFingerprint: 'fingerprint',
    items,
    issues: [],
  });

  // As the backend reports leaving out clientSecret and registrationCertificateDefaults.
  const removals = registrarUpdate([
    { path: '/spec/clientSecret', before: '[redacted]', redacted: true },
    {
      path: '/spec/registrationCertificateDefaults/privacy_policy',
      before: 'https://rp.example/privacy',
    },
  ]);

  let portability: {
    plan: ReturnType<typeof vi.fn>;
    import: ReturnType<typeof vi.fn>;
    importArchive: ReturnType<typeof vi.fn>;
    listResources: ReturnType<typeof vi.fn>;
    listOperations: ReturnType<typeof vi.fn>;
    planReattach: ReturnType<typeof vi.fn>;
  };
  let confirm: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<ConfigPortabilityComponent>;
  let component: ConfigPortabilityComponent;

  beforeEach(() => {
    portability = {
      plan: vi.fn(),
      import: vi.fn(async () => ({ ...planWith(), operationId: 'operation' })),
      importArchive: vi.fn(async () => ({ ...planWith(), operationId: 'operation' })),
      listResources: vi.fn(async () => []),
      listOperations: vi.fn(async () => []),
      planReattach: vi.fn(),
    };
    confirm = vi.fn(() => true);
    vi.stubGlobal('confirm', confirm);
    TestBed.configureTestingModule({
      imports: [ConfigPortabilityComponent],
      providers: [
        provideRouter([]),
        { provide: ConfigPortabilityService, useValue: portability },
        { provide: JwtService, useValue: { hasRole: () => true } },
      ],
    });
    fixture = TestBed.createComponent(ConfigPortabilityComponent);
    component = fixture.componentInstance;
    component.bundle = bundle;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function planImport(plan: ConfigImportPlan): Promise<HTMLElement> {
    portability.plan.mockResolvedValue(plan);
    await component.planImport();
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  /** The text of each change row: field, current value, value after the import. */
  function changeRows(element: HTMLElement): string[][] {
    return [...element.querySelectorAll('table.changes tr.mat-mdc-row')].map((row) =>
      [...row.querySelectorAll('td')].map((cell) => {
        // Icon ligatures are hidden from assistive technology; read the cell without them.
        const text = cell.cloneNode(true) as HTMLElement;
        text.querySelectorAll('mat-icon').forEach((icon) => icon.remove());
        return text.textContent!.trim();
      })
    );
  }

  it('lists the field changes of an update with removed, secret and changed values', async () => {
    const element = await planImport(
      planWith(
        registrarUpdate([
          { path: '/spec/clientSecret', before: '[redacted]', redacted: true },
          { path: '/spec/password', before: '[redacted]', after: '[redacted]', redacted: true },
          {
            path: '/spec/registrarUrl',
            before: 'https://old.example',
            after: 'https://new.example',
          },
          { path: '/spec/retries', after: 3 },
          { path: '/spec/headers', before: '[changed]', after: '[changed]', redacted: true },
          {
            path: '/spec/registrationCertificateDefaults/privacy_policy',
            before: 'https://rp.example/privacy',
          },
        ])
      )
    );

    expect(element.querySelector('h3')?.textContent).toContain(
      'Changes to RegistrarConfig/registrar'
    );
    expect(changeRows(element)).toEqual([
      ['/spec/clientSecret', 'secret', 'removed'],
      ['/spec/password', 'secret', 'secret'],
      ['/spec/registrarUrl', '"https://old.example"', '"https://new.example"'],
      ['/spec/retries', 'not set', '3'],
      ['/spec/headers', 'changed', 'changed'],
      [
        '/spec/registrationCertificateDefaults/privacy_policy',
        '"https://rp.example/privacy"',
        'removed',
      ],
    ]);
    expect(element.querySelector('table.changes th.mat-column-after')?.textContent).toContain(
      'After import'
    );
    expect(element.querySelectorAll('table.changes .removed')).toHaveLength(2);
    expect(element.querySelector('td.mat-column-action')?.textContent).toContain(
      '6 fields, 2 removed'
    );
    expect(element.textContent).toContain(
      'Secret values are not shown, nor values that change between an object, a list and a ' +
        'plain value.'
    );
  });

  it('shows a value that only looks like a redaction marker as it is', async () => {
    const element = await planImport(
      planWith(registrarUpdate([{ path: '/spec/clientId', before: '[redacted]', after: 'client' }]))
    );

    expect(changeRows(element)).toEqual([['/spec/clientId', '"[redacted]"', '"client"']]);
    expect(element.textContent).not.toContain('Secret values');
  });

  it('shows null as a value, not as a removal', async () => {
    const element = await planImport(
      planWith(
        registrarUpdate([
          { path: '/spec/dcql_query/claims/0/path/1', before: 'given', after: null },
        ])
      )
    );

    expect(changeRows(element)).toEqual([['/spec/dcql_query/claims/0/path/1', '"given"', 'null']]);
    expect(element.querySelector('td.mat-column-action')?.textContent).not.toContain('removed');
    await component.applyImport();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('labels the replaced values "Before" once the plan is applied', async () => {
    const element = await planImport(planWith(removals));
    const valueHeader = () =>
      element.querySelector('table.changes th.mat-column-before')?.textContent?.trim();
    expect(valueHeader()).toBe('Current');

    portability.import.mockResolvedValue({ ...planWith(removals), operationId: 'operation' });
    await component.applyImport();
    fixture.detectChanges();

    expect(valueHeader()).toBe('Before');
    expect(element.textContent).toContain('Applied. Operation: operation');
    expect(changeRows(element)).toHaveLength(2);
  });

  it('keeps the stored values "Current" when the backend refuses the apply', async () => {
    const element = await planImport(planWith(removals));
    // A refused apply has an operation, but nothing was written.
    portability.import.mockRejectedValue({
      statusCode: 409,
      code: 'CONFIG_PLAN_STALE',
      message: 'The bundle, mode or target configuration changed.',
      operationId: 'operation',
    });

    await component.applyImport();
    fixture.detectChanges();

    expect(element.querySelector('table.changes th.mat-column-before')?.textContent?.trim()).toBe(
      'Current'
    );
    expect(element.textContent).toContain('Apply failed. Operation: operation');
  });

  it('applies a plan without removals in upsert mode without asking', async () => {
    await planImport(
      planWith(registrarUpdate([{ path: '/spec/clientId', before: 'old', after: 'new' }]))
    );

    await component.applyImport();

    expect(confirm).not.toHaveBeenCalled();
    expect(portability.import).toHaveBeenCalledWith(bundle, 'upsert', false, 'fingerprint');
  });

  it('names the resources whose stored values the import removes before applying', async () => {
    await planImport(planWith(removals));

    await component.applyImport();

    expect(confirm).toHaveBeenCalledWith(
      'The import removes stored values that the bundle leaves out, marked as removed in the ' +
        'plan: RegistrarConfig/registrar (2 fields). This cannot be undone. Continue?'
    );
    expect(portability.import).toHaveBeenCalledWith(bundle, 'upsert', false, 'fingerprint');
  });

  it('names every resource that loses values, with the number of fields', async () => {
    await planImport(
      planWith(
        {
          ...registrarUpdate([{ path: '/spec/description', before: 'old' }]),
          kind: 'KmsConfig',
          id: 'kms',
        },
        removals
      )
    );

    await component.applyImport();

    expect(confirm).toHaveBeenCalledWith(
      'The import removes stored values that the bundle leaves out, marked as removed in the ' +
        'plan: KmsConfig/kms (1 field), RegistrarConfig/registrar (2 fields). ' +
        'This cannot be undone. Continue?'
    );
  });

  it('does not apply the plan when the removal is not confirmed', async () => {
    confirm.mockReturnValue(false);
    await planImport(planWith(removals));

    await component.applyImport();

    expect(portability.import).not.toHaveBeenCalled();
  });

  it('asks once about the resources it deletes and the values it removes in replace mode', async () => {
    component.mode = 'replace';
    const deletion = (kind: string, id: string): ConfigPlanItem => ({
      ...registrarUpdate(undefined),
      kind,
      id,
      action: 'delete',
    });
    await planImport(
      planWith(removals, deletion('CredentialConfig', 'pid'), deletion('TrustList', 'tl-1'))
    );

    await component.applyImport();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith(
      'Replace mode deletes file-managed resources from this bundle source that are not in the ' +
        'bundle: CredentialConfig/pid, TrustList/tl-1. The import removes stored values that the ' +
        'bundle leaves out, marked as removed in the plan: RegistrarConfig/registrar (2 fields). ' +
        'This cannot be undone. Continue?'
    );
    expect(portability.import).toHaveBeenCalledWith(bundle, 'replace', true, 'fingerprint');
  });

  it('asks before every replace import, also when it deletes and removes nothing', async () => {
    component.mode = 'replace';
    confirm.mockReturnValue(false);
    await planImport(
      planWith(registrarUpdate([{ path: '/spec/clientId', before: 'a', after: 'b' }]))
    );

    await component.applyImport();

    expect(confirm).toHaveBeenCalledWith('This replace import deletes no resources. Continue?');
    expect(portability.import).not.toHaveBeenCalled();
  });

  it('confirms the replacement when it applies a ZIP bundle', async () => {
    const archive = new File(['zip'], 'bundle.zip');
    component.bundle = undefined;
    component.bundleArchive = archive;
    component.mode = 'replace';
    component.plan = planWith();

    await component.applyImport();

    expect(confirm).toHaveBeenCalledWith('This replace import deletes no resources. Continue?');
    expect(portability.importArchive).toHaveBeenCalledWith(archive, 'replace', true, 'fingerprint');
  });

  it('lists the changes of a reset to the file version', async () => {
    // jsdom has no scrollIntoView; the reset plan scrolls itself into view.
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: scrollIntoView,
      configurable: true,
    });
    portability.planReattach.mockResolvedValue(planWith(removals));

    try {
      await component.planReattach({
        kind: 'RegistrarConfig',
        resourceId: 'registrar',
      } as ConfigResourceMetadata);
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;

      expect(element.querySelector('table.changes th.mat-column-after')?.textContent).toContain(
        'After reset'
      );
      expect(changeRows(element)).toHaveLength(2);
      await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    } finally {
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    }
  });
});
