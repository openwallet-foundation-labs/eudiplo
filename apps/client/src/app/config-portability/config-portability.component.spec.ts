import type { MatSnackBar } from '@angular/material/snack-bar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { JwtService } from '../services/jwt.service';
import { ConfigPortabilityComponent } from './config-portability.component';
import type {
  ConfigPortabilityService,
  ConfigResourceMetadata,
} from './config-portability.service';

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
      'Detached 0 of 3 resource(s): the backend could not be reached. ' +
        'Check the connection and try again.',
      'Close',
      { duration: 8000 }
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
      'Detached 1 of 3 resource(s). Failed: CredentialConfig/pid: Resource not found; ' +
        'TrustList/tl-1: the backend could not be reached. Check the connection and try again.',
      'Close',
      { duration: 8000 }
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
      'Detached 1 of 3 resource(s). Failed: CredentialConfig/pid: Resource not found; ' +
        'TrustList/tl-1: failed',
      'Close',
      { duration: 8000 }
    );
  });
});
