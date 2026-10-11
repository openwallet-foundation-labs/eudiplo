import { client } from '@eudiplo/sdk-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CredentialConfigService } from '../../issuance/credential-config/credential-config.service';
import { KeyChainService } from '../../key-management/key-chain.service';
import { StatusListEditComponent } from './status-list-edit.component';

describe('StatusListEditComponent', () => {
  afterEach(() => {
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
  });

  it('names the source that failed, keeps the other select usable and retries it alone', async () => {
    let credentialsFail = true;
    const fetchStub = vi.fn<typeof fetch>(async (input) => {
      const path = new URL((input as Request).url).pathname;
      const failed = path === '/api/issuer/credentials' && credentialsFail;
      return new Response(
        JSON.stringify(
          failed
            ? { statusCode: 403, message: 'Forbidden resource' }
            : [{ id: 'status-keys', usageType: 'statusList' }]
        ),
        { status: failed ? 403 : 200, headers: { 'Content-Type': 'application/json' } }
      );
    });
    client.setConfig({ fetch: fetchStub });
    const snackBar = { open: vi.fn() };
    const component = new StatusListEditComponent(
      { snapshot: { paramMap: { get: () => null } } } as never,
      { navigate: vi.fn() } as never,
      snackBar as never,
      {} as never,
      new CredentialConfigService(),
      new KeyChainService()
    );

    component.ngOnInit();
    await vi.waitFor(() => expect(component.isLoading).toBe(false));

    expect(component.loadState).toEqual({ credentialConfigs: 'failed', keyChains: 'loaded' });
    expect(component.keyChains.map((keyChain) => keyChain.id)).toEqual(['status-keys']);
    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to load credential configurations: Forbidden resource'
    );

    credentialsFail = false;
    fetchStub.mockClear();
    await component.retrySource('credentialConfigs');

    expect(component.loadState.credentialConfigs).toBe('loaded');
    expect(fetchStub).toHaveBeenCalledOnce();
  });
});
