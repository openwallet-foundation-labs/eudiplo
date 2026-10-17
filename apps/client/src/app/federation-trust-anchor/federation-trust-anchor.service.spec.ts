import { client } from '@eudiplo/sdk-core';
import { afterEach, describe, expect, it } from 'vitest';
import {
  entityConfigurationUri,
  FederationTrustAnchorService,
  isFederationEntityId,
} from './federation-trust-anchor.service';

describe('FederationTrustAnchorService', () => {
  /** Answers each GET with the next body (a status code fails it) and counts the requests. */
  function respondWith(...bodies: (unknown[] | number)[]): { count: number } {
    const calls = { count: 0 };
    client.setConfig({
      fetch: async () => {
        const body = bodies[Math.min(calls.count++, bodies.length - 1)];
        return typeof body === 'number'
          ? new Response(JSON.stringify({ message: 'Unavailable' }), { status: body })
          : new Response(JSON.stringify(body), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
      },
    });
    return calls;
  }

  afterEach(() => {
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
  });

  const anchor = { id: 'ta', tenantId: 't', entityId: 'https://ta.example', jwks: { keys: [] } };

  it('loads the registered trust anchors once for all pickers and again on reload', async () => {
    const calls = respondWith([anchor], []);
    const service = new FederationTrustAnchorService();

    expect(service.registeredEntityIds()).toBeUndefined();
    await Promise.all([service.registeredAnchors(), service.registeredAnchors()]);
    expect(calls.count).toBe(1);
    expect(service.registeredEntityIds()).toEqual(new Set(['https://ta.example']));

    await service.registeredAnchors(true);
    expect(calls.count).toBe(2);
    expect(service.registeredEntityIds()).toEqual(new Set());
  });

  it('loads the registered trust anchors again after a registration changed', async () => {
    const calls = respondWith([], [anchor]);
    const service = new FederationTrustAnchorService();
    await service.registeredAnchors();

    client.setConfig({
      fetch: async (request: RequestInfo | URL) => {
        if ((request as Request).method === 'POST')
          return new Response(JSON.stringify(anchor), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        calls.count++;
        return new Response(JSON.stringify([anchor]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });
    await service.create({ id: 'ta', entityId: anchor.entityId, jwks: { keys: [] } as never });
    await service.registeredAnchors();

    expect(calls.count).toBe(2);
    expect(service.registeredEntityIds()).toEqual(new Set(['https://ta.example']));
  });

  it('forgets the registered trust anchors after an update or delete', async () => {
    const calls = { count: 0 };
    client.setConfig({
      fetch: async (request: RequestInfo | URL) => {
        const method = (request as Request).method;
        if (method === 'GET') calls.count++;
        return new Response(JSON.stringify(method === 'GET' ? [anchor] : anchor), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });
    const service = new FederationTrustAnchorService();

    for (const write of [
      () => service.update('ta', { description: 'Renamed' }),
      () => service.delete('ta'),
    ]) {
      await service.registeredAnchors();
      const before = calls.count;
      await write();
      // Until the next load, the wizard leaves the check to the backend.
      expect(service.registeredEntityIds()).toBeUndefined();
      await service.registeredAnchors();
      expect(calls.count).toBe(before + 1);
    }
  });

  it('tries again after a failed load and keeps the last known list meanwhile', async () => {
    const calls = respondWith([anchor], 503, [anchor]);
    const service = new FederationTrustAnchorService();
    await service.registeredAnchors();

    await expect(service.registeredAnchors(true)).rejects.toBeDefined();
    expect(service.registeredEntityIds()).toEqual(new Set(['https://ta.example']));
    await service.registeredAnchors();
    expect(calls.count).toBe(3);
  });
});

describe('federation entity IDs', () => {
  it.each([
    ['https://ta.example', true],
    ['https://ta.example/federation/', true],
    ['http://ta.example', false],
    ['https://ta.example?x=1', false],
    ['https://ta.example#top', false],
    ['https://ta.example?', false],
    ['ta.example', false],
  ])('accepts %s: %s', (value, valid) => {
    expect(isFederationEntityId(value)).toBe(valid);
  });

  it('places the entity configuration under the entity ID', () => {
    expect(entityConfigurationUri('https://ta.example/')).toBe(
      'https://ta.example/.well-known/openid-federation'
    );
    expect(entityConfigurationUri('https://ta.example/fed')).toBe(
      'https://ta.example/fed/.well-known/openid-federation'
    );
  });
});
