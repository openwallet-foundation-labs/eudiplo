import { FormBuilder } from '@angular/forms';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IssuanceConfigCreateComponent } from './issuance-config-create.component';
import {
  pemToBase64Der,
  TEST_ROOT_CERTIFICATE_PEM,
} from '../../../utils/certificate-validator.testing';

const config = {
  display: [{ name: 'Example Issuer', locale: 'en-US' }],
  authorizationServers: [{ type: 'built-in', id: 'issuer-built-in', enabled: true }],
  batchSize: 1,
  dPopRequired: true,
};

describe('issuer settings guided setup', () => {
  let component: IssuanceConfigCreateComponent;
  let service: { getConfig: ReturnType<typeof vi.fn>; saveConfiguration: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let setup: string | null;
  beforeEach(() => {
    setup = null;
    snackBar = { open: vi.fn() };
    service = {
      getConfig: vi.fn().mockResolvedValue(config),
      saveConfiguration: vi.fn().mockResolvedValue({}),
    };
    component = new IssuanceConfigCreateComponent(
      service as any,
      { navigate: vi.fn() } as any,
      { snapshot: { queryParamMap: { get: () => setup } } } as any,
      snackBar as any,
      {} as any,
      new FormBuilder(),
      {} as any,
      {} as any
    );
  });

  it('opens existing identity in direct editing and allows explicit guided setup', async () => {
    await component.loadConfigForEdit();
    expect(component.guidedMode).toBe(false);
    expect(component.form.valid).toBe(true); // Logo is optional.
    setup = 'true';
    await component.loadConfigForEdit();
    expect(component.guidedMode).toBe(true);
  });

  it('guides an issuer with no identity and validates before advancing', async () => {
    service.getConfig.mockResolvedValue({ ...config, display: [] });
    await component.loadConfigForEdit();
    expect(component.guidedMode).toBe(true);
    component.submitSettings();
    expect(component.activeStep).toBe(0);
    expect(component.stepError).toContain('Identity');
    expect(component.displays.at(0).get('name')!.touched).toBe(true);
    component.displays.at(0).get('name')!.setValue('Example Issuer');
    component.onInputEnter(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(component.activeStep).toBe(1);
    component.submitSettings();
    component.submitSettings();
    expect(component.activeStep).toBe(3);
    expect(service.saveConfiguration).not.toHaveBeenCalled();
    component.submitSettings();
    expect(service.saveConfiguration).toHaveBeenCalledOnce();
    expect(service.saveConfiguration.mock.calls[0][0]).toMatchObject(config);
  });

  it('loads and saves shared wallet provider trust lists unchanged', async () => {
    const walletProviderTrustLists = [
      {
        url: 'https://trust.example/list',
        verifierKey: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
        verifierX509Der: pemToBase64Der(TEST_ROOT_CERTIFICATE_PEM),
      },
      {
        url: 'https://trust.example/pem',
        verifierKeyPem: '-----BEGIN PUBLIC KEY-----\nMFkw\n-----END PUBLIC KEY-----',
      },
      { trustListId: 'wallet-providers' },
    ];
    service.getConfig.mockResolvedValue({ ...config, walletProviderTrustLists });
    await component.loadConfigForEdit();
    expect(component.walletProviderTrustLists).toHaveLength(3);
    expect(component.form.valid).toBe(true);
    component.submitSettings();
    expect(service.saveConfiguration.mock.calls[0][0].walletProviderTrustLists).toEqual(
      walletProviderTrustLists
    );
  });

  it('preserves values across mode switches', async () => {
    await component.loadConfigForEdit();
    component.form.get('batchSize')!.setValue(5);
    const before = component.form.getRawValue();
    component.toggleGuidedMode();
    component.toggleGuidedMode();
    expect(component.form.getRawValue()).toEqual(before);
  });

  it('blocks saving on loading failure and supports retry', async () => {
    service.getConfig.mockRejectedValueOnce({ statusCode: 403, message: 'Forbidden resource' });
    await component.loadConfigForEdit();
    expect(component.loadError).toBe(
      'Could not load issuer settings: Forbidden resource. Retry before making changes.'
    );
    component.onSubmit();
    expect(service.saveConfiguration).not.toHaveBeenCalled();
    await component.loadConfigForEdit();
    expect(component.loadError).toBe('');
  });

  it("shows the backend's reason when saving is rejected", async () => {
    service.saveConfiguration.mockRejectedValue({
      statusCode: 409,
      error: 'Conflict',
      message:
        "Tenant 'tenant' is file-managed by provisioning. Detach it before changing it through the API or UI.",
    });
    await component.loadConfigForEdit();

    component.onSubmit();

    await vi.waitFor(() =>
      expect(snackBar.open.mock.lastCall?.[0]).toBe(
        "Failed to save configuration: Tenant 'tenant' is file-managed by provisioning. Detach it before changing it through the API or UI."
      )
    );
  });

  it('names every rejected field, since the form shows none of them at a field', async () => {
    service.saveConfiguration.mockRejectedValue({
      statusCode: 400,
      message: 'Validation failed',
      errors: ['a', 'b', 'c', 'd'].map((path) => ({
        path: ['display', 0, path],
        message: 'Invalid',
      })),
    });
    await component.loadConfigForEdit();

    component.onSubmit();

    await vi.waitFor(() =>
      expect(snackBar.open.mock.lastCall?.[0]).toBe(
        'Failed to save configuration: Validation failed (display.0.a: Invalid; ' +
          'display.0.b: Invalid; display.0.c: Invalid; display.0.d: Invalid)'
      )
    );
  });

  it('opens trust settings for missing prerequisites', async () => {
    await component.loadConfigForEdit();
    component.registrationCertificate.patchValue({ enabled: true, mode: 'import', jwt: '' });
    component.onSubmit();
    expect(component.activeStep).toBe(2);
    expect(component.stepError).toContain('JWT');
    expect(component.expandedSections.has('registration')).toBe(true);
    component.registrationCertificate.patchValue({ enabled: false });
    component.federation.patchValue({ enabled: true });
    component.onSubmit();
    expect(component.stepError).toContain('trust anchor');
    expect(service.saveConfiguration).not.toHaveBeenCalled();
  });

  it('omits a display logo without a URI', async () => {
    await component.loadConfigForEdit();
    component.onSubmit();
    const [payload] = service.saveConfiguration.mock.calls[0];
    expect(payload.display).toEqual([{ name: 'Example Issuer', locale: 'en-US' }]);
  });

  it('keeps the federation entity settings the form does not edit', async () => {
    service.getConfig.mockResolvedValue({
      ...config,
      federation: {
        mode: 'hybrid',
        entityId: 'https://issuer.example/issuers/root',
        trustAnchors: [
          {
            entityId: 'https://trust.example',
            entityConfigurationUri: 'https://trust.example/config',
          },
        ],
        entityTypes: ['openid_credential_issuer', 'openid_credential_verifier'],
        authorityHints: ['https://intermediate.example'],
        includeTrustChain: true,
      },
    });
    await component.loadConfigForEdit();
    component.onSubmit();
    expect(service.saveConfiguration.mock.calls[0][0].federation).toMatchObject({
      entityId: 'https://issuer.example/issuers/root',
      entityTypes: ['openid_credential_issuer', 'openid_credential_verifier'],
      authorityHints: ['https://intermediate.example'],
      includeTrustChain: true,
    });
  });

  it('explicitly clears disabled trust settings and resets the PIN limit', async () => {
    service.getConfig.mockResolvedValue({
      ...config,
      txCodeMaxAttempts: 9,
      federation: {
        role: 'leaf',
        mode: 'hybrid',
        trustAnchors: [
          {
            entityId: 'https://trust.example',
            entityConfigurationUri: 'https://trust.example/config',
          },
        ],
      },
      registrationCertificate: { enabled: true, mode: 'import', jwt: 'existing.jwt.value' },
    });
    await component.loadConfigForEdit();
    expect(component.federationEnabled).toBe(true);
    component.federation.patchValue({ enabled: false });
    component.registrationCertificate.patchValue({ enabled: false });
    component.form.get('txCodeMaxAttempts')!.setValue(null);
    component.onSubmit();
    expect(service.saveConfiguration.mock.calls[0][0]).toMatchObject({
      federation: null,
      registrationCertificate: null,
      txCodeMaxAttempts: null,
    });
  });

  it('rejects duplicate and reserved authorization IDs before save', async () => {
    await component.loadConfigForEdit();
    component.authorizationServers.at(0).get('id')!.setValue('built-in');
    component.onSubmit();
    expect(component.stepError).toContain('reserved');
    expect(component.activeStep).toBe(1);
    component.authorizationServers.at(0).get('id')!.setValue('same');
    component.addAuthorizationServer();
    component.authorizationServers
      .at(1)
      .patchValue({ id: 'same', label: 'Second', enabled: false });
    component.onSubmit();
    expect(component.stepError).toContain('unique');
    expect(service.saveConfiguration).not.toHaveBeenCalled();
  });

  it('defaults the built-in token lifetime to 300 s and keeps explicit values', async () => {
    await component.loadConfigForEdit();
    expect(component.authorizationServers.at(0).get('token.lifetimeSeconds')!.value).toBe(300);
    component.onSubmit();
    expect(service.saveConfiguration.mock.calls[0][0].authorizationServers[0].token).toMatchObject({
      lifetimeSeconds: 300,
    });

    service.getConfig.mockResolvedValue({
      ...config,
      authorizationServers: [
        { ...config.authorizationServers[0], token: { lifetimeSeconds: 900 } },
      ],
    });
    await component.loadConfigForEdit();
    const payload = (component as any).buildConfigurationPayload();
    expect(payload.authorizationServers[0].token).toMatchObject({ lifetimeSeconds: 900 });
  });

  it('switches token lifetime defaults with the server type unless the user edited it', async () => {
    await component.loadConfigForEdit();
    component.removeAuthorizationServer(0);
    component.addAuthorizationServer();
    const lifetime = () => component.authorizationServers.at(0).get('token.lifetimeSeconds')!;
    expect(lifetime().value).toBe(3600);

    component.authorizationServers.at(0).get('type')!.setValue('built-in');
    component.onAuthorizationServerTypeChange(0, 'built-in');
    expect(lifetime().value).toBe(300);

    component.authorizationServers.at(0).get('type')!.setValue('chained');
    component.onAuthorizationServerTypeChange(0, 'chained');
    expect(lifetime().value).toBe(3600);

    lifetime().setValue(1200);
    lifetime().markAsDirty();
    component.authorizationServers.at(0).get('type')!.setValue('built-in');
    component.onAuthorizationServerTypeChange(0, 'built-in');
    expect(lifetime().value).toBe(1200);
  });
});
