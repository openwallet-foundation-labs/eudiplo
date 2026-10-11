import { TestBed } from '@angular/core/testing';
import { client } from '@eudiplo/sdk-core';
import { afterEach, describe, expect, it } from 'vitest';
import { SchemaService } from './schema.service';

describe('SchemaService', () => {
  function respondWith(body: unknown) {
    client.setConfig({
      fetch: async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    });
  }

  afterEach(() => {
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
  });

  it('returns empty vocabularies for missing or malformed lists', async () => {
    const service = TestBed.inject(SchemaService);

    respondWith({});
    await expect(service.getVocabularies()).resolves.toEqual({
      version: '',
      categories: [],
      tags: [],
    });

    respondWith({ version: '2', categories: null, tags: 'pid' });
    await expect(service.getVocabularies()).resolves.toEqual({
      version: '2',
      categories: [],
      tags: [],
    });
  });

  it('passes the vocabularies through', async () => {
    const vocabularies = {
      version: '1',
      categories: [{ code: 'identity', label: 'Identity', status: 'active' }],
      tags: [{ code: 'pid', label: 'PID', status: 'active' }],
    };
    respondWith(vocabularies);

    await expect(TestBed.inject(SchemaService).getVocabularies()).resolves.toEqual(vocabularies);
  });
});
