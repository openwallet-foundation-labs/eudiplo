import type { CredentialConfig, PresentationConfig } from '@eudiplo/sdk-core';

import {
  credentialConfigReferencesTrustList,
  presentationConfigReferencesTrustList,
  urlNamesTrustList,
} from './trust-list-reference';

const list = { id: 'membership-issuers', tenantId: 'membership-demo' };

describe('urlNamesTrustList', () => {
  it('matches the public URL and the tenant URL placeholder', () => {
    expect(
      urlNamesTrustList(
        'https://eudiplo.example.com/issuers/membership-demo/trust-list/membership-issuers',
        list
      )
    ).toBe(true);
    expect(urlNamesTrustList('<TENANT_URL>/trust-list/membership-issuers', list)).toBe(true);
    expect(urlNamesTrustList('<TENANT_URL>/trust-list/membership-issuers/', list)).toBe(true);
    expect(urlNamesTrustList('<TENANT_URL>/trust-list/membership-issuers?format=jwt', list)).toBe(
      true
    );
  });

  it('matches an id and a tenant the URL encodes', () => {
    expect(
      urlNamesTrustList('https://eudiplo.example.com/issuers/eu%20demo/trust-list/eu%20members', {
        id: 'eu members',
        tenantId: 'eu demo',
      })
    ).toBe(true);
  });

  it('compares a segment it cannot decode as it is', () => {
    expect(urlNamesTrustList('<TENANT_URL>/trust-list/100%', { ...list, id: '100%' })).toBe(true);
  });

  it('does not match another list whose id starts with the id', () => {
    expect(urlNamesTrustList('<TENANT_URL>/trust-list/membership-issuers-old', list)).toBe(false);
  });

  // The demo trust list has the same id in every tenant that imported the demo.
  it('does not match the list of the same id in another tenant', () => {
    expect(
      urlNamesTrustList(
        'https://eudiplo.example.com/issuers/other-tenant/trust-list/membership-issuers',
        list
      )
    ).toBe(false);
  });

  it('does not match an external list whose URL only ends in /trust-list/<id>', () => {
    expect(urlNamesTrustList('https://lists.example.com/trust-list/membership-issuers', list)).toBe(
      false
    );
  });

  it('does not match a missing URL, the bare id or a URL without a trust-list segment', () => {
    expect(urlNamesTrustList(undefined, list)).toBe(false);
    expect(urlNamesTrustList('membership-issuers', list)).toBe(false);
    expect(urlNamesTrustList('https://lists.example.com/membership-issuers', list)).toBe(false);
  });
});

describe('credentialConfigReferencesTrustList', () => {
  function config(trustedAuthorities: object[]): CredentialConfig {
    return { id: 'membership', schemaMeta: { trustedAuthorities } } as unknown as CredentialConfig;
  }

  it('matches a tenant list named by trustListId, as the schema form writes it', () => {
    expect(credentialConfigReferencesTrustList(config([{ trustListId: list.id }]), list)).toBe(
      true
    );
  });

  it('matches an etsi_tl authority by id or by URL', () => {
    expect(
      credentialConfigReferencesTrustList(
        config([{ frameworkType: 'etsi_tl', value: list.id }]),
        list
      )
    ).toBe(true);
    expect(
      credentialConfigReferencesTrustList(
        config([{ frameworkType: 'etsi_tl', value: `<TENANT_URL>/trust-list/${list.id}` }]),
        list
      )
    ).toBe(true);
  });

  it('does not match another list whose id starts with the id', () => {
    expect(
      credentialConfigReferencesTrustList(
        config([{ frameworkType: 'etsi_tl', value: `<TENANT_URL>/trust-list/${list.id}-old` }]),
        list
      )
    ).toBe(false);
  });

  it('ignores authorities of other frameworks and configs without schema metadata', () => {
    expect(
      credentialConfigReferencesTrustList(
        config([
          { frameworkType: 'openid_federation', value: `<TENANT_URL>/trust-list/${list.id}` },
        ]),
        list
      )
    ).toBe(false);
    expect(
      credentialConfigReferencesTrustList({ id: 'pid' } as unknown as CredentialConfig, list)
    ).toBe(false);
  });
});

describe('presentationConfigReferencesTrustList', () => {
  function config(trustedAuthorities?: object[]): PresentationConfig {
    return {
      id: 'door-check',
      dcql_query: {
        credentials: [
          {
            id: 'card',
            format: 'dc+sd-jwt',
            meta: { vct_values: ['urn:membership'] },
            ...(trustedAuthorities ? { trusted_authorities: trustedAuthorities } : {}),
          },
        ],
      },
    } as unknown as PresentationConfig;
  }

  it('matches an etsi_tl value by trustListId or by URL', () => {
    expect(
      presentationConfigReferencesTrustList(
        config([{ type: 'etsi_tl', values: [{ trustListId: ` ${list.id} ` }] }]),
        list
      )
    ).toBe(true);
    expect(
      presentationConfigReferencesTrustList(
        config([{ type: 'etsi_tl', values: [{ url: `<TENANT_URL>/trust-list/${list.id}` }] }]),
        list
      )
    ).toBe(true);
  });

  it('ignores OpenID Federation authorities and queries without trusted authorities', () => {
    expect(
      presentationConfigReferencesTrustList(
        config([{ type: 'openid_federation', values: [`<TENANT_URL>/trust-list/${list.id}`] }]),
        list
      )
    ).toBe(false);
    expect(presentationConfigReferencesTrustList(config(), list)).toBe(false);
    expect(
      presentationConfigReferencesTrustList(
        { id: 'empty', dcql_query: {} } as PresentationConfig,
        list
      )
    ).toBe(false);
  });
});
