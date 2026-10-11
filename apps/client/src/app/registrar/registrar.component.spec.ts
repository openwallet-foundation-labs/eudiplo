import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegistrarComponent } from './registrar.component';
import { RegistrarConfig, RegistrarService } from './registrar.service';

const stored: RegistrarConfig = {
  registrarUrl: 'https://registrar.example/api',
  oidcUrl: 'https://auth.example/realms/registrar',
  clientId: 'client',
  username: 'user',
  hasPassword: true,
  hasClientSecret: true,
};

describe('RegistrarComponent credentials', () => {
  let registrarService: {
    getConfig: ReturnType<typeof vi.fn>;
    saveConfig: ReturnType<typeof vi.fn>;
    updateConfig: ReturnType<typeof vi.fn>;
    deleteConfig: ReturnType<typeof vi.fn>;
  };
  let component: RegistrarComponent;

  async function load(config: RegistrarConfig): Promise<void> {
    registrarService.getConfig.mockResolvedValue(config);
    await component.loadData();
  }

  beforeEach(() => {
    registrarService = {
      getConfig: vi.fn(),
      saveConfig: vi.fn(async () => stored),
      updateConfig: vi.fn(async () => stored),
      deleteConfig: vi.fn(async () => undefined),
    };
    component = new RegistrarComponent(
      registrarService as unknown as RegistrarService,
      { open: vi.fn() } as unknown as MatSnackBar,
      new FormBuilder()
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
    vi.unstubAllGlobals();
  });
});
