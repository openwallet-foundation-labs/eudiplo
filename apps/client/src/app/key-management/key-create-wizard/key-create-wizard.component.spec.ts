import { FormBuilder } from '@angular/forms';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KeyCreateWizardComponent } from './key-create-wizard.component';

describe('KeyCreateWizardComponent errors', () => {
  let keyChainService: { import: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  /** A wizard on the external access certificate step with this key and certificate. */
  function create(externalCertificate: string): KeyCreateWizardComponent {
    const component = new KeyCreateWizardComponent(
      new FormBuilder(),
      keyChainService as never,
      {} as never,
      {} as never,
      { navigate: vi.fn() } as never,
      snackBar as never
    );
    component.usageForm.patchValue({ usage: 'access' });
    component.accessSourceForm.patchValue({ accessSource: 'external' });
    component.configForm.patchValue({
      externalPrivateKey: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----',
      externalCertificate,
    });
    return component;
  }

  beforeEach(() => {
    keyChainService = { import: vi.fn() };
    snackBar = { open: vi.fn() };
  });

  it('says what is wrong with the external certificate', async () => {
    await create('').createKey();

    expect(keyChainService.import).not.toHaveBeenCalled();
    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to create key chain: At least one certificate is required.'
    );
  });

  it("shows the backend's reason when the import is rejected", async () => {
    keyChainService.import.mockRejectedValue({
      statusCode: 400,
      message: 'The certificate does not match the private key',
    });

    await create('-----BEGIN CERTIFICATE-----\ncert\n-----END CERTIFICATE-----').createKey();

    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to create key chain: The certificate does not match the private key'
    );
  });
});
