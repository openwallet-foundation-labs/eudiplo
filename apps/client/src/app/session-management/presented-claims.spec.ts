import { describe, expect, it } from 'vitest';

import { presentedCredentials } from './presented-claims';

describe('presentedCredentials', () => {
  it('flattens OpenID4VP values into claim rows and keeps metadata apart', () => {
    expect(
      presentedCredentials([
        {
          id: 'membership',
          values: [
            {
              iss: 'https://issuer.example',
              vct: 'urn:example:membership',
              iat: 1,
              cnf: { jwk: {} },
              _sd_alg: 'sha-256',
              name: 'Max',
              address: { locality: 'Berlin' },
              tags: ['a', 'b'],
              note: null,
            },
          ],
        },
      ])
    ).toEqual([
      {
        queryId: 'membership',
        type: 'urn:example:membership',
        issuer: 'https://issuer.example',
        claims: [
          { path: 'name', value: 'Max' },
          { path: 'address.locality', value: 'Berlin' },
          { path: 'tags.0', value: 'a' },
          { path: 'tags.1', value: 'b' },
          { path: 'note', value: '—' },
        ],
      },
    ]);
  });

  it('reads ISO 18013-7 credentials and one entry per presented value', () => {
    const result = presentedCredentials([
      {
        id: 'mdl',
        format: 'mso_mdoc',
        docType: 'org.iso.18013.5.1.mDL',
        claims: { 'org.iso.18013.5.1': { age_over_18: true } },
      },
      { id: 'pid', values: [{ given_name: 'A' }, { given_name: 'B' }] },
    ]);

    expect(result.map((c) => [c.queryId, c.type, c.claims])).toEqual([
      ['mdl', 'org.iso.18013.5.1.mDL', [{ path: 'org.iso.18013.5.1.age_over_18', value: 'true' }]],
      ['pid', null, [{ path: 'given_name', value: 'A' }]],
      ['pid', null, [{ path: 'given_name', value: 'B' }]],
    ]);
  });

  it('summarises binary values instead of listing their bytes', () => {
    const portrait = Object.fromEntries(
      Array.from({ length: 2048 }, (_, i) => [String(i), i % 256])
    );
    const [credential] = presentedCredentials([
      {
        id: 'mdl',
        docType: 'org.iso.18013.5.1.mDL',
        claims: { ns: { portrait, small: [1, 2, 3] } },
      },
    ]);

    expect(credential.claims).toEqual([
      { path: 'ns.portrait', value: 'Binary data, 2 kB' },
      { path: 'ns.small.0', value: '1' },
      { path: 'ns.small.1', value: '2' },
      { path: 'ns.small.2', value: '3' },
    ]);
  });

  it('ignores anything that is not a list of credentials', () => {
    expect(presentedCredentials(null)).toEqual([]);
    expect(presentedCredentials(['junk', { id: 'x' }])).toEqual([]);
  });
});
