import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ConfigOwnershipService,
  ConfigResourceMetadata,
} from '../config-portability/config-ownership.service';
import { RegistrarComponent } from './registrar.component';
import { RegistrarConfig, RegistrarConfigRequest, RegistrarService } from './registrar.service';

const stored: RegistrarConfig = {
  registrarUrl: 'https://registrar.example/api',
  oidcUrl: 'https://auth.example/realms/registrar',
  clientId: 'client',
  username: 'user',
  hasPassword: true,
  hasClientSecret: true,
};

// Tests stub `confirm`; restore it even when an assertion fails.
afterEach(() => vi.unstubAllGlobals());

type SaveRequest = (config: Partial<RegistrarConfigRequest>) => Promise<RegistrarConfig>;

/** Ownership service whose record is gone once the cache is invalidated, as after a delete. */
function ownershipMock(metadata?: ConfigResourceMetadata) {
  let current = metadata;
  return {
    get: vi.fn(async () => current),
    isManaged: vi.fn(async () => false),
    invalidate: vi.fn(() => {
      current = undefined;
    }),
  };
}

const detached: ConfigResourceMetadata = {
  tenantId: 'tenant',
  kind: 'RegistrarConfig',
  resourceId: 'registrar',
  ownership: 'detached',
  generation: 2,
  source: 'folder:/config/tenant',
};

function serviceMock() {
  return {
    getConfig: vi.fn(),
    saveConfig: vi.fn<SaveRequest>(async () => stored),
    updateConfig: vi.fn<SaveRequest>(async () => stored),
    deleteConfig: vi.fn(async () => undefined),
  };
}

describe('RegistrarComponent credentials', () => {
  let registrarService: ReturnType<typeof serviceMock>;
  let component: RegistrarComponent;

  async function load(config: RegistrarConfig): Promise<void> {
    registrarService.getConfig.mockResolvedValue(config);
    await component.loadData();
  }

  beforeEach(() => {
    registrarService = serviceMock();
    component = new RegistrarComponent(
      registrarService as unknown as RegistrarService,
      { open: vi.fn() } as unknown as MatSnackBar,
      new FormBuilder(),
      ownershipMock() as unknown as ConfigOwnershipService
    );
  });

  it('keeps the stored password and client secret while the URLs stay the same', async () => {
    await load(stored);

    expect(component.urlsChanged).toBe(false);
    expect(component.configForm.valid).toBe(true);
  });

  it('requires the password again after the OIDC URL changes', async () => {
    await load(stored);

    component.configForm.get('oidcUrl')?.setValue('https://auth.other.example/realms/x');

    expect(component.urlsChanged).toBe(true);
    expect(component.configForm.get('password')?.hasError('required')).toBe(true);
    expect(component.configForm.get('clientSecret')?.valid).toBe(true);
  });

  it('replaces the configuration after the registrar URL changes', async () => {
    await load(stored);
    component.configForm.patchValue({
      registrarUrl: 'https://registrar.other.example/api',
      password: 'new-password',
    });

    await component.saveConfig();

    expect(registrarService.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        registrarUrl: 'https://registrar.other.example/api',
        password: 'new-password',
        clientSecret: undefined,
      })
    );
    expect(registrarService.updateConfig).not.toHaveBeenCalled();
  });

  it('updates the configuration while the URLs stay the same', async () => {
    await load(stored);
    component.configForm.patchValue({ username: 'other-user' });

    await component.saveConfig();

    const patch = registrarService.updateConfig.mock.calls[0][0];
    expect(patch).toEqual(expect.objectContaining({ username: 'other-user' }));
    expect(patch).not.toHaveProperty('registrarUrl');
    expect(patch).not.toHaveProperty('oidcUrl');
    expect(registrarService.saveConfig).not.toHaveBeenCalled();
  });

  it('sends a changed client ID in an update', async () => {
    await load(stored);
    component.configForm.patchValue({ clientId: 'other-client' });

    await component.saveConfig();

    expect(registrarService.updateConfig.mock.calls[0][0].clientId).toBe('other-client');
  });

  it('clears the entered password and client secret once they are saved', async () => {
    await load(stored);
    component.configForm.patchValue({ password: 'new-password', clientSecret: 'new-secret' });
    component.togglePasswordVisibility();

    await component.saveConfig();
    await component.saveConfig();

    expect(component.configForm.value.password).toBe('');
    expect(component.configForm.value.clientSecret).toBe('');
    expect(component.showPassword).toBe(false);
    const secondUpdate = registrarService.updateConfig.mock.calls[1][0];
    expect(secondUpdate).not.toHaveProperty('password');
    expect(secondUpdate.clientSecret).toBeUndefined();
  });

  it('leaves an unchanged client ID and username out of an update', async () => {
    await load(stored);
    component.configForm.patchValue({
      registrationCertificateDefaults: { support_uri: 'mailto:support@verifier.example' },
    });

    await component.saveConfig();

    const patch = registrarService.updateConfig.mock.calls[0][0];
    expect(patch).not.toHaveProperty('clientId');
    expect(patch).not.toHaveProperty('username');
    expect(patch).not.toHaveProperty('password');
  });

  it('does not count surrounding whitespace as a URL change', async () => {
    await load(stored);

    component.configForm.get('registrarUrl')?.setValue(` ${stored.registrarUrl} `);

    expect(component.urlsChanged).toBe(false);
    expect(component.configForm.valid).toBe(true);
  });

  it('sends the URLs trimmed', async () => {
    registrarService.getConfig.mockResolvedValue(null);
    await component.loadData();
    component.configForm.patchValue({
      registrarUrl: ' https://registrar.example/api ',
      oidcUrl: 'https://auth.example/realms/registrar\t',
      clientId: 'client',
      username: 'user',
      password: 'password',
    });

    await component.saveConfig();

    expect(registrarService.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        registrarUrl: 'https://registrar.example/api',
        oidcUrl: 'https://auth.example/realms/registrar',
      })
    );
  });

  it('keeps the stored password again after replacing the configuration', async () => {
    const replaced = { ...stored, registrarUrl: 'https://registrar.other.example/api' };
    registrarService.saveConfig.mockResolvedValue(replaced);
    await load(stored);
    component.configForm.patchValue({
      registrarUrl: replaced.registrarUrl,
      password: 'new-password',
    });

    await component.saveConfig();
    component.configForm.patchValue({ password: '' });

    expect(component.urlsChanged).toBe(false);
    expect(component.configForm.valid).toBe(true);
  });

  it('keeps the stored credentials again when the URL is changed back', async () => {
    await load(stored);

    component.configForm.get('oidcUrl')?.setValue('https://auth.other.example/realms/x');
    component.configForm.get('oidcUrl')?.setValue(stored.oidcUrl);

    expect(component.configForm.valid).toBe(true);
  });

  it('requires the password again after deleting the configuration', async () => {
    vi.stubGlobal('confirm', () => true);
    await load(stored);

    await component.deleteConfig();

    expect(component.configForm.get('password')?.hasError('required')).toBe(true);
  });
});

describe('RegistrarComponent registration certificate defaults', () => {
  const defaults = {
    privacy_policy: 'https://verifier.example/privacy',
    support_uri: 'mailto:support@verifier.example',
    provides_attestations: ['urn:example:pid'],
  };
  let registrarService: ReturnType<typeof serviceMock>;
  let component: RegistrarComponent;

  async function load(registrationCertificateDefaults: Record<string, unknown>): Promise<void> {
    registrarService.getConfig.mockResolvedValue({ ...stored, registrationCertificateDefaults });
    await component.loadData();
  }

  function sentDefaults(mock: ReturnType<typeof serviceMock>['saveConfig']): unknown {
    return mock.mock.calls[0][0].registrationCertificateDefaults;
  }

  beforeEach(() => {
    registrarService = serviceMock();
    component = new RegistrarComponent(
      registrarService as unknown as RegistrarService,
      { open: vi.fn() } as unknown as MatSnackBar,
      new FormBuilder(),
      ownershipMock() as unknown as ConfigOwnershipService
    );
  });

  it('keeps defaults the form does not show when it updates the configuration', async () => {
    await load(defaults);
    component.configForm.patchValue({
      registrationCertificateDefaults: { support_uri: 'https://verifier.example/support' },
    });

    await component.saveConfig();

    expect(sentDefaults(registrarService.updateConfig)).toEqual({
      ...defaults,
      support_uri: 'https://verifier.example/support',
    });
  });

  it('keeps defaults the form does not show when a new URL replaces the configuration', async () => {
    await load(defaults);
    component.configForm.patchValue({
      oidcUrl: 'https://auth.other.example/realms/x',
      password: 'new-password',
    });

    await component.saveConfig();

    expect(sentDefaults(registrarService.saveConfig)).toEqual(defaults);
  });

  it('removes a default whose field was cleared', async () => {
    await load(defaults);
    component.configForm.patchValue({ registrationCertificateDefaults: { privacy_policy: '  ' } });

    await component.saveConfig();

    expect(sentDefaults(registrarService.updateConfig)).toEqual({
      support_uri: defaults.support_uri,
      provides_attestations: defaults.provides_attestations,
    });
  });

  it('keeps a default of another type, which the form cannot show', async () => {
    await load({ intermediary: { id: 'intermediary-rp' } });

    await component.saveConfig();

    expect(sentDefaults(registrarService.updateConfig)).toEqual({
      intermediary: { id: 'intermediary-rp' },
    });
  });

  it('sends the defaults of a new configuration', async () => {
    registrarService.getConfig.mockResolvedValue(null);
    await component.loadData();
    component.configForm.patchValue({
      registrarUrl: 'https://registrar.example/api',
      oidcUrl: 'https://auth.example/realms/registrar',
      clientId: 'client',
      username: 'user',
      password: 'password',
      registrationCertificateDefaults: { privacy_policy: ' https://verifier.example/privacy ' },
    });

    await component.saveConfig();

    expect(sentDefaults(registrarService.saveConfig)).toEqual({
      privacy_policy: 'https://verifier.example/privacy',
    });
  });

  it('starts from no defaults after the configuration was deleted', async () => {
    vi.stubGlobal('confirm', () => true);
    await load(defaults);
    await component.deleteConfig();
    component.configForm.patchValue({
      registrarUrl: 'https://registrar.example/api',
      oidcUrl: 'https://auth.example/realms/registrar',
      clientId: 'client',
      username: 'user',
      password: 'password',
    });

    await component.saveConfig();

    expect(sentDefaults(registrarService.saveConfig)).toBeNull();
  });

  it('sends null once no default is left', async () => {
    await load({ privacy_policy: defaults.privacy_policy });
    component.configForm.patchValue({ registrationCertificateDefaults: { privacy_policy: '' } });

    await component.saveConfig();

    expect(sentDefaults(registrarService.updateConfig)).toBeNull();
  });
});

describe('RegistrarComponent load and save errors', () => {
  let registrarService: ReturnType<typeof serviceMock>;
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let ownership: ReturnType<typeof ownershipMock>;
  let component: RegistrarComponent;

  async function load(config: RegistrarConfig): Promise<void> {
    registrarService.getConfig.mockResolvedValue(config);
    await component.loadData();
  }

  beforeEach(() => {
    registrarService = serviceMock();
    snackBar = { open: vi.fn() };
    ownership = ownershipMock();
    component = new RegistrarComponent(
      registrarService as unknown as RegistrarService,
      snackBar as unknown as MatSnackBar,
      new FormBuilder(),
      ownership as unknown as ConfigOwnershipService
    );
  });

  it('reports a failed load and its reason instead of offering a new configuration', async () => {
    registrarService.getConfig.mockRejectedValue(
      new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' })
    );

    await component.loadData();

    expect(component.loadError).toContain('The registrar configuration could not be loaded');
    expect(component.loadError).toContain('500 Internal Server Error');
    expect(component.hasConfig).toBe(false);
  });

  it('names what deleting removes before it deletes', async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    await load(stored);

    await component.deleteConfig();

    const [question] = confirm.mock.calls[0] as unknown as [string];
    expect(question).toContain(
      'Its URLs, account, stored password, client secret and registration certificate defaults are removed.'
    );
    expect(question).toContain('presentation requests are sent without registration certificates');
    expect(question).toContain('This cannot be undone.');
    expect(registrarService.deleteConfig).not.toHaveBeenCalled();
    expect(component.hasConfig).toBe(true);
  });

  it('leaves the client secret out of the question when none is stored', async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    await load({ ...stored, hasClientSecret: false });

    await component.deleteConfig();

    const [question] = confirm.mock.calls[0] as unknown as [string];
    expect(question).toContain('stored password and registration certificate defaults');
    expect(question).not.toContain('client secret');
  });

  it('says that a startup import can restore a detached configuration', async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    ownership.get.mockResolvedValue(detached);
    await load(stored);

    await component.deleteConfig();

    const [question] = confirm.mock.calls[0] as unknown as [string];
    expect(question).toContain('A startup import from folder:/config/tenant can restore it.');
    expect(question).not.toContain('This cannot be undone.');
  });

  it('starts over without a preset after deleting', async () => {
    vi.stubGlobal('confirm', () => true);
    await load(stored);
    component.selectedPreset = 'German Sandbox';

    await component.deleteConfig();

    expect(component.selectedPreset).toBe('');
    expect(component.hasConfig).toBe(false);
  });

  it('marks the delete, not a save, as running', async () => {
    vi.stubGlobal('confirm', () => true);
    await load(stored);
    let finish!: () => void;
    registrarService.deleteConfig.mockReturnValue(
      new Promise<undefined>((resolve) => (finish = () => resolve(undefined)))
    );

    const deleting = component.deleteConfig();
    await vi.waitFor(() => expect(component.isDeleting).toBe(true));
    expect(component.isSaving).toBe(false);
    finish();
    await deleting;

    expect(component.isDeleting).toBe(false);
  });

  it("names the backend's reason for a failed delete and keeps the configuration", async () => {
    vi.stubGlobal('confirm', () => true);
    await load(stored);
    registrarService.deleteConfig.mockRejectedValue(
      new HttpErrorResponse({
        status: 403,
        statusText: 'Forbidden',
        error: { statusCode: 403, message: 'Forbidden resource' },
      })
    );

    await component.deleteConfig();

    expect(snackBar.open).toHaveBeenCalledWith(
      'Failed to delete configuration: Forbidden resource',
      'Close',
      expect.anything()
    );
    expect(component.hasConfig).toBe(true);
    expect(component.configForm.value.registrarUrl).toBe(stored.registrarUrl);
  });

  it("names the backend's reason for a failed load", async () => {
    registrarService.getConfig.mockRejectedValue(
      new HttpErrorResponse({
        status: 403,
        statusText: 'Forbidden',
        error: { statusCode: 403, message: 'Forbidden resource' },
      })
    );

    await component.loadData();

    expect(component.loadError).toBe(
      'The registrar configuration could not be loaded: Forbidden resource'
    );
  });

  it('clears the load error once a retry succeeds', async () => {
    registrarService.getConfig.mockRejectedValueOnce(new HttpErrorResponse({ status: 503 }));
    await component.loadData();
    registrarService.getConfig.mockResolvedValue(stored);

    await component.loadData();

    expect(component.loadError).toBe('');
    expect(component.hasConfig).toBe(true);
    expect(component.configForm.value.registrarUrl).toBe(stored.registrarUrl);
  });

  it('rejects a registrar or OIDC URL without a scheme', () => {
    const registrarUrl = component.configForm.get('registrarUrl')!;
    const oidcUrl = component.configForm.get('oidcUrl')!;

    registrarUrl.setValue('registrar.example/api');
    oidcUrl.setValue('mailto:auth@example.org');
    expect(registrarUrl.hasError('url')).toBe(true);
    expect(oidcUrl.hasError('url')).toBe(true);
    expect(component.fieldError('registrarUrl')).toBe(
      'Enter a full URL, for example https://registrar.example.com/api'
    );

    registrarUrl.setValue('https://registrar.example/api');
    oidcUrl.setValue('http://127.0.0.1:8080/realms/registrar');
    expect(registrarUrl.valid).toBe(true);
    expect(oidcUrl.valid).toBe(true);
  });

  function validationFailed(errors: unknown[]) {
    return new HttpErrorResponse({
      status: 400,
      error: { statusCode: 400, message: 'Validation failed', errors },
    });
  }

  it('shows a rejected field under the field until it is edited', async () => {
    await load(stored);
    registrarService.updateConfig.mockRejectedValue(
      validationFailed([{ path: ['clientId'], message: 'Too small', code: 'too_small' }])
    );
    component.configForm.patchValue({ clientId: 'other-client' });

    await component.saveConfig();

    const clientId = component.configForm.get('clientId')!;
    expect(clientId.touched).toBe(true);
    expect(component.fieldError('clientId')).toBe('Too small');
    expect(snackBar.open).toHaveBeenCalledWith(
      'Failed to save configuration. Check the highlighted fields.',
      'Close',
      expect.anything()
    );

    clientId.setValue('another-client');
    expect(clientId.valid).toBe(true);
  });

  it('rejects a URL with a query, fragment or credentials', () => {
    for (const value of [
      'https://registrar.example/api?',
      'https://auth.example/realms/x#',
      'https://user:secret@registrar.example',
    ]) {
      component.configForm.patchValue({ registrarUrl: value });
      expect(component.fieldError('registrarUrl')).toBe(
        'Enter an http(s) URL without query, fragment or credentials'
      );
    }
  });

  it('highlights a stored URL that breaks the base URL rule right after loading', async () => {
    await load({ ...stored, oidcUrl: 'https://auth.example/realms/registrar#' });

    expect(component.configForm.get('oidcUrl')?.touched).toBe(true);
    expect(component.hasInvalidInput).toBe(true);
  });

  it('says what to do when the outbound URL policy blocks a URL', async () => {
    await load(stored);
    registrarService.updateConfig.mockRejectedValue(
      validationFailed([
        {
          path: ['oidcUrl'],
          message: 'Outbound URL host is not in the allowlist',
          code: 'outbound_url_policy',
        },
      ])
    );

    await component.saveConfig();

    const hint =
      "Check the URL; if it is correct, ask the operator to allow it in this instance's outbound URL policy.";
    expect(component.fieldError('oidcUrl')).toBe(
      `Outbound URL host is not in the allowlist. ${hint}`
    );
    expect(snackBar.open).toHaveBeenCalledWith(
      `Failed to save configuration. ${hint}`,
      'Close',
      expect.anything()
    );
  });

  it('suggests checking the host name when it cannot be resolved', async () => {
    await load(stored);
    registrarService.updateConfig.mockRejectedValue(
      validationFailed([
        {
          path: ['oidcUrl'],
          message: 'Outbound URL host cannot be resolved',
          code: 'outbound_url_policy',
        },
      ])
    );

    await component.saveConfig();

    expect(component.fieldError('oidcUrl')).toBe(
      'Outbound URL host cannot be resolved. Check the host name, or try again later.'
    );
  });

  it('saves again after a backend rejection without an edit', async () => {
    await load(stored);
    registrarService.updateConfig.mockRejectedValueOnce(
      validationFailed([
        {
          path: ['oidcUrl'],
          message: 'Outbound URL host is not in the allowlist',
          code: 'outbound_url_policy',
        },
      ])
    );
    await component.saveConfig();
    expect(component.hasInvalidInput).toBe(false);

    // The operator allowed the host in the meantime.
    await component.saveConfig();

    expect(registrarService.updateConfig).toHaveBeenCalledTimes(2);
    expect(component.configForm.get('oidcUrl')?.hasError('server')).toBe(false);
  });

  it('says what to do when the policy blocks the discovered token endpoint', async () => {
    await load(stored);
    registrarService.updateConfig.mockRejectedValue(
      new HttpErrorResponse({
        status: 400,
        error: {
          statusCode: 400,
          message:
            'Registrar credentials could not be verified: Request to https://idp.internal/token is blocked by the outbound URL policy: Outbound URL host is not in the allowlist',
        },
      })
    );
    component.configForm.patchValue({ clientId: 'other-client' });

    await component.saveConfig();

    expect(snackBar.open.mock.calls.at(-1)?.[0]).toBe(
      'Failed to save configuration: Registrar credentials could not be verified: Request to https://idp.internal/token is blocked by the outbound URL policy: Outbound URL host is not in the allowlist. ' +
        "Check the URL; if it is correct, ask the operator to allow it in this instance's outbound URL policy."
    );
  });

  it('saves a rejected new URL again with POST and the entered password', async () => {
    await load(stored);
    registrarService.saveConfig.mockRejectedValueOnce(
      validationFailed([
        {
          path: ['registrarUrl'],
          message: 'Outbound URL host is not in the allowlist',
          code: 'outbound_url_policy',
        },
      ])
    );
    component.configForm.patchValue({
      registrarUrl: 'https://registrar.other.example/api',
      password: 'new-password',
    });

    await component.saveConfig();
    expect(component.configForm.get('registrarUrl')?.hasError('server')).toBe(true);

    await component.saveConfig();

    expect(registrarService.saveConfig).toHaveBeenCalledTimes(2);
    expect(registrarService.saveConfig.mock.calls[1][0]).toMatchObject({
      registrarUrl: 'https://registrar.other.example/api',
      password: 'new-password',
    });
    expect(registrarService.updateConfig).not.toHaveBeenCalled();
  });

  it('suggests checking the host name when the discovered token endpoint does not resolve', async () => {
    await load(stored);
    registrarService.updateConfig.mockRejectedValue(
      new HttpErrorResponse({
        status: 400,
        error: {
          statusCode: 400,
          message:
            'Registrar credentials could not be verified: Request to https://idp.example/token is blocked by the outbound URL policy: Outbound URL host cannot be resolved',
        },
      })
    );
    component.configForm.patchValue({ clientId: 'other-client' });

    await component.saveConfig();

    expect(snackBar.open.mock.calls.at(-1)?.[0]).toMatch(
      /cannot be resolved\. Check the host name, or try again later\.$/
    );
  });

  it('shows field issues at their fields and lists the others', async () => {
    await load(stored);
    registrarService.updateConfig.mockRejectedValue(
      validationFailed([
        { path: ['clientId'], message: 'Too small', code: 'too_small' },
        {
          path: ['registrationCertificateDefaults'],
          message: 'Invalid input',
          code: 'invalid_type',
        },
      ])
    );
    component.configForm.patchValue({ clientId: 'other-client' });

    await component.saveConfig();

    expect(component.fieldError('clientId')).toBe('Too small');
    expect(snackBar.open).toHaveBeenCalledWith(
      'Failed to save configuration. Check the highlighted fields. registrationCertificateDefaults: Invalid input',
      'Close',
      expect.anything()
    );
  });

  it('lists issues outside the form fields in the message', async () => {
    await load(stored);
    registrarService.updateConfig.mockRejectedValue(
      validationFailed([
        { path: [], message: 'Unrecognized key: "extra"', code: 'unrecognized_keys' },
        {
          path: ['registrationCertificateDefaults'],
          message: 'Invalid input',
          code: 'invalid_type',
        },
      ])
    );

    await component.saveConfig();

    expect(snackBar.open).toHaveBeenCalledWith(
      'Failed to save configuration. Unrecognized key: "extra"; registrationCertificateDefaults: Invalid input',
      'Close',
      expect.anything()
    );
  });

  it('shows the message of a save the backend refused for another reason', async () => {
    await load(stored);
    registrarService.updateConfig.mockRejectedValueOnce(
      new HttpErrorResponse({
        status: 400,
        error: {
          statusCode: 400,
          message:
            'Invalid registrar credentials: the OIDC provider answered with HTTP 401, invalid_grant. Please check your username, password, client ID and secret.',
        },
      })
    );
    registrarService.updateConfig.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 }));

    await component.saveConfig();
    await component.saveConfig();

    expect(snackBar.open).toHaveBeenNthCalledWith(
      1,
      'Failed to save configuration: Invalid registrar credentials: the OIDC provider answered with HTTP 401, invalid_grant. Please check your username, password, client ID and secret.',
      'Close',
      expect.anything()
    );
    expect(snackBar.open).toHaveBeenNthCalledWith(
      2,
      'Failed to save configuration: the backend could not be reached. Check the connection and try again.',
      'Close',
      expect.anything()
    );
  });
});

describe('RegistrarComponent rendered', () => {
  let registrarService: ReturnType<typeof serviceMock>;

  async function render(
    config: RegistrarConfig | null | HttpErrorResponse,
    ownership = ownershipMock()
  ) {
    registrarService = serviceMock();
    if (config instanceof HttpErrorResponse) {
      registrarService.getConfig.mockRejectedValue(config);
    } else {
      registrarService.getConfig.mockResolvedValue(config);
    }
    await TestBed.configureTestingModule({
      imports: [RegistrarComponent],
      providers: [
        provideRouter([]),
        { provide: RegistrarService, useValue: registrarService },
        { provide: ConfigOwnershipService, useValue: ownership },
      ],
    })
      .overrideProvider(MatSnackBar, { useValue: { open: vi.fn() } })
      .compileComponents();
    const fixture = TestBed.createComponent(RegistrarComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.isLoading).toBe(false));
    fixture.detectChanges();
    return fixture;
  }

  function element(fixture: { nativeElement: unknown }): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function enter(
    fixture: { nativeElement: unknown; detectChanges(): void },
    name: string,
    value: string
  ) {
    const input = element(fixture).querySelector<HTMLInputElement>(
      `input[formcontrolname="${name}"]`
    )!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  it('asks for the stored password and client secret again once a URL changes', async () => {
    const fixture = await render(stored);
    expect(element(fixture).textContent).toContain('Password is set. Enter a new value');
    expect(element(fixture).textContent).toContain('Client secret is set. Enter a new value');

    enter(fixture, 'oidcUrl', 'https://auth.other.example/realms/x');

    const text = element(fixture).textContent;
    expect(text).toContain('The URL changed. Enter the password again.');
    expect(text).toContain('The URL changed. Enter it again, or leave empty to remove it.');
    expect(text).not.toContain('Password is set.');
  });

  it('shows an error with Retry instead of the form when loading fails', async () => {
    const fixture = await render(new HttpErrorResponse({ status: 500 }));
    expect(element(fixture).querySelector('[role="alert"]')?.textContent).toContain(
      'could not be loaded'
    );
    expect(element(fixture).querySelector('form')).toBeNull();

    registrarService.getConfig.mockResolvedValue(stored);
    const retry = [...element(fixture).querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Retry')
    )!;
    retry.click();
    await vi.waitFor(() => expect(fixture.componentInstance.isLoading).toBe(false));
    fixture.detectChanges();

    expect(element(fixture).querySelector('[role="alert"]')).toBeNull();
    expect(element(fixture).querySelector('form')).not.toBeNull();
  });

  it('explains a URL without a scheme', async () => {
    const fixture = await render(null);

    enter(fixture, 'registrarUrl', 'registrar.example.com/api');

    expect(element(fixture).querySelector('mat-error')?.textContent).toContain(
      'Enter a full URL, for example https://registrar.example.com/api'
    );
  });

  it('names a missing URL', async () => {
    const fixture = await render(null);

    enter(fixture, 'registrarUrl', '');

    expect(element(fixture).querySelector('mat-error')?.textContent).toContain(
      'Registrar URL is required'
    );
  });

  it('shows a field the backend rejected under that field', async () => {
    const fixture = await render(stored);
    registrarService.updateConfig.mockRejectedValue(
      new HttpErrorResponse({
        status: 400,
        error: {
          statusCode: 400,
          message: 'Validation failed',
          errors: [{ path: ['username'], message: 'Too small', code: 'too_small' }],
        },
      })
    );
    enter(fixture, 'username', 'other-user');

    await fixture.componentInstance.saveConfig();
    fixture.detectChanges();

    const field = element(fixture)
      .querySelector('input[formcontrolname="username"]')!
      .closest('mat-form-field')!;
    expect(field.querySelector('mat-error')?.textContent).toContain('Too small');
  });

  it('tells whether the stored password is kept', async () => {
    const newConfig = await render(null);
    const password = (fixture: { nativeElement: unknown }) =>
      element(fixture).querySelector<HTMLInputElement>('input[formcontrolname="password"]')!;
    expect(password(newConfig).placeholder).toBe('Enter password');
    TestBed.resetTestingModule();

    const storedConfig = await render(stored);
    expect(password(storedConfig).placeholder).toBe('Leave empty to keep existing');
  });

  function button(fixture: { nativeElement: unknown }, label: string): HTMLButtonElement {
    return [...element(fixture).querySelectorAll('button')].find((candidate) =>
      candidate.textContent?.includes(label)
    )!;
  }

  it('keeps Save enabled when a field carries only a backend rejection', async () => {
    const fixture = await render(stored);
    registrarService.updateConfig.mockRejectedValueOnce(
      new HttpErrorResponse({
        status: 400,
        error: {
          statusCode: 400,
          message: 'Validation failed',
          errors: [
            {
              path: ['oidcUrl'],
              message: 'Outbound URL host is not in the allowlist',
              code: 'outbound_url_policy',
            },
          ],
        },
      })
    );

    await fixture.componentInstance.saveConfig();
    fixture.detectChanges();

    expect(element(fixture).textContent).toContain('Outbound URL host is not in the allowlist');
    expect(button(fixture, 'Update Configuration').disabled).toBe(false);
  });

  it('disables Save and Delete while a delete runs, without the save spinner', async () => {
    vi.stubGlobal('confirm', () => true);
    const fixture = await render(stored);
    let finish!: () => void;
    registrarService.deleteConfig.mockReturnValue(
      new Promise<undefined>((resolve) => (finish = () => resolve(undefined)))
    );

    button(fixture, 'Delete').click();
    await vi.waitFor(() => expect(fixture.componentInstance.isDeleting).toBe(true));
    fixture.detectChanges();

    expect(button(fixture, 'Delete').disabled).toBe(true);
    expect(button(fixture, 'Update Configuration').disabled).toBe(true);
    expect(element(fixture).querySelector('.button-spinner')).toBeNull();

    finish();
    await vi.waitFor(() => expect(fixture.componentInstance.isDeleting).toBe(false));
    fixture.detectChanges();
    expect(button(fixture, 'Save Configuration')).toBeDefined();
  });

  it('drops the detached notice once the configuration is deleted', async () => {
    vi.stubGlobal('confirm', () => true);
    const fixture = await render(stored, ownershipMock(detached));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element(fixture).textContent).toContain('Detached from folder:/config/tenant');
    });

    await fixture.componentInstance.deleteConfig();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element(fixture).textContent).not.toContain('Detached from');
    });
  });

  it('labels the visibility toggles and reveals only their own field', async () => {
    const fixture = await render(stored);
    const toggle = (label: string) =>
      element(fixture).querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    const input = (name: string) =>
      element(fixture).querySelector<HTMLInputElement>(`input[formcontrolname="${name}"]`)!;
    expect(toggle('Show client secret').getAttribute('aria-pressed')).toBe('false');
    expect(toggle('Show password').getAttribute('aria-pressed')).toBe('false');

    toggle('Show client secret').click();
    fixture.detectChanges();

    expect(toggle('Show client secret').getAttribute('aria-pressed')).toBe('true');
    expect(input('clientSecret').type).toBe('text');
    expect(input('password').type).toBe('password');
  });
});
