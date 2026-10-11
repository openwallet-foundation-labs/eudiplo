import type { MatSnackBar } from '@angular/material/snack-bar';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtService } from '../services/jwt.service';
import { ConfigPortabilityComponent } from './config-portability.component';
import {
  type ConfigImportPlan,
  ConfigPortabilityService,
  type ConfigResourceMetadata,
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

describe('ConfigPortabilityComponent applying a file-managed client from file', () => {
  let reattach: ReturnType<typeof vi.fn>;
  let openSnackBar: ReturnType<typeof vi.fn>;
  let confirm: ReturnType<typeof vi.fn>;
  let component: ConfigPortabilityComponent;

  const folderClient = {
    kind: 'Client',
    resourceId: 'folder-client',
    ownership: 'file-managed',
    source: 'folder:/app/config/demo',
  } as unknown as ConfigResourceMetadata;

  beforeEach(() => {
    reattach = vi.fn(async () => ({
      applicable: true,
      items: [],
      generatedSecrets: [{ id: 'folder-client', value: 'secret' }],
    }));
    openSnackBar = vi.fn();
    confirm = vi.fn(() => true);
    component = new ConfigPortabilityComponent(
      {
        reattach,
        listResources: vi.fn(async () => [folderClient]),
        listOperations: vi.fn(async () => []),
      } as unknown as ConfigPortabilityService,
      { open: openSnackBar } as unknown as MatSnackBar,
      { hasRole: () => true } as unknown as JwtService
    );
    vi.stubGlobal('confirm', confirm);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers it only for file-managed clients from the config folder', () => {
    expect(component.canApplyFromFile(folderClient)).toBe(true);
    expect(
      component.canApplyFromFile({
        ...folderClient,
        source: 'bundle:demo',
      } as ConfigResourceMetadata)
    ).toBe(false);
    expect(
      component.canApplyFromFile({
        ...folderClient,
        ownership: 'detached',
      } as ConfigResourceMetadata)
    ).toBe(false);
    expect(
      component.canApplyFromFile({ ...folderClient, kind: 'KeyChain' } as ConfigResourceMetadata)
    ).toBe(false);
  });

  function planFor(changes: { path: string }[]): ConfigImportPlan {
    return {
      applicable: true,
      planFingerprint: 'a'.repeat(64),
      items: [{ kind: 'Client', id: 'folder-client', action: 'update', changes }],
    } as unknown as ConfigImportPlan;
  }

  it('warns that the current secret stops working and shows the new one', async () => {
    component.reattachTarget = folderClient;
    component.plan = planFor([{ path: '/spec/secret' }]);

    await component.applyReattach();

    expect(confirm).toHaveBeenCalledWith(
      'Apply Client/folder-client from the config folder again? folder-client gets a new secret, ' +
        'and its current secret stops working immediately.'
    );
    expect(reattach).toHaveBeenCalledWith('Client', 'folder-client', 'a'.repeat(64));
    expect(component.generatedSecrets).toEqual([{ id: 'folder-client', value: 'secret' }]);
    expect(openSnackBar).toHaveBeenCalledWith(
      'Client/folder-client was applied from the file',
      'Close',
      { duration: 3000 }
    );
  });

  it('does not warn about the secret when the plan keeps it', async () => {
    component.reattachTarget = folderClient;
    component.plan = planFor([{ path: '/spec/description' }]);

    await component.applyReattach();

    expect(confirm).toHaveBeenCalledWith(
      'Apply Client/folder-client from the config folder again?'
    );
  });

  it('warns about the secret when resetting a detached client too', async () => {
    component.reattachTarget = { ...folderClient, ownership: 'detached' } as ConfigResourceMetadata;
    component.plan = planFor([{ path: '/spec/secret' }]);

    await component.applyReattach();

    expect(confirm).toHaveBeenCalledWith(
      'Reset Client/folder-client to the file version? Changes made through the API or UI are ' +
        'discarded. folder-client gets a new secret, and its current secret stops working immediately.'
    );
    expect(openSnackBar).toHaveBeenCalledWith(
      'Client/folder-client is file-managed again',
      'Close',
      {
        duration: 3000,
      }
    );
  });

  it('applies nothing when the confirmation is cancelled', async () => {
    confirm.mockReturnValue(false);
    component.reattachTarget = folderClient;
    component.plan = planFor([{ path: '/spec/secret' }]);

    await component.applyReattach();

    expect(reattach).not.toHaveBeenCalled();
  });

  it('does not count a client the plan creates, which has no current secret', () => {
    component.reattachTarget = { ...folderClient, ownership: 'detached' } as ConfigResourceMetadata;
    component.plan = planFor([{ path: '/spec/secret' }]);
    component.plan.items[0].action = 'create';

    expect(component.planRegeneratesClientSecret).toBe(false);
  });

  it('keeps a shown secret when the next plan replaces the applied one, until dismissed', async () => {
    component.reattachTarget = folderClient;
    component.plan = planFor([{ path: '/spec/secret' }]);
    await component.applyReattach();
    (component as unknown as { portability: { planReattach: unknown } }).portability.planReattach =
      vi.fn(async () => planFor([]));

    await component.planReattach({ ...folderClient, resourceId: 'other-client' });

    expect(component.generatedSecrets).toEqual([{ id: 'folder-client', value: 'secret' }]);
    confirm.mockReturnValue(false);
    component.dismissGeneratedSecrets();
    expect(component.generatedSecrets).toHaveLength(1);
    confirm.mockReturnValue(true);
    component.dismissGeneratedSecrets();
    expect(component.generatedSecrets).toEqual([]);
  });

  it('names applying, not resetting, when planning Apply from file fails', async () => {
    (component as unknown as { portability: { planReattach: unknown } }).portability.planReattach =
      vi.fn(async () => {
        throw {};
      });

    await component.planReattach(folderClient);

    expect(openSnackBar).toHaveBeenCalledWith(
      expect.stringContaining('Could not plan applying the file version'),
      'Close',
      expect.anything()
    );
  });
});

describe('ConfigPortabilityComponent template for Apply from file', () => {
  const resources = [
    {
      kind: 'Client',
      resourceId: 'folder-client',
      ownership: 'file-managed',
      source: 'folder:/app/config/demo',
      generation: 1,
    },
    {
      kind: 'Client',
      resourceId: 'bundle-client',
      ownership: 'file-managed',
      source: 'bundle:demo',
      generation: 1,
    },
  ] as unknown as ConfigResourceMetadata[];

  async function render() {
    TestBed.configureTestingModule({
      imports: [ConfigPortabilityComponent],
      providers: [
        provideRouter([]),
        {
          provide: ConfigPortabilityService,
          useValue: {
            listResources: vi.fn(async () => resources),
            listOperations: vi.fn(async () => []),
          },
        },
        { provide: JwtService, useValue: { hasRole: () => true } },
      ],
    });
    const fixture = TestBed.createComponent(ConfigPortabilityComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  const buttons = (element: HTMLElement, label: string) =>
    [...element.querySelectorAll('button')].filter(
      (button) => button.textContent?.trim() === label
    );

  it('offers Apply from file only in the row of the folder client', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;

    expect(buttons(element, 'Apply from file')).toHaveLength(1);
    expect(buttons(element, 'Apply from file')[0].closest('tr')?.textContent).toContain(
      'folder-client'
    );
  });

  it('titles the plan and announces the new secret only while the plan changes it', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;
    component.reattachTarget = resources[0];
    component.plan = {
      applicable: true,
      planFingerprint: 'a'.repeat(64),
      issues: [],
      items: [
        {
          kind: 'Client',
          id: 'folder-client',
          action: 'update',
          issues: [],
          migrations: [],
          changes: [{ path: '/spec/secret' }],
        },
      ],
    } as unknown as ConfigImportPlan;
    fixture.detectChanges();

    expect(element.textContent).toContain('Apply Client/folder-client from file');
    expect(element.textContent).toContain('New secret');

    component.plan = { ...component.plan, operationId: 'operation-1' };
    fixture.detectChanges();
    expect(element.textContent).not.toContain('New secret');
  });
});
