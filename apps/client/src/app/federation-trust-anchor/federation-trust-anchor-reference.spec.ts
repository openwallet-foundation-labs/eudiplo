import type { IssuanceConfig, PresentationConfig } from '@eudiplo/sdk-core';
import { describe, expect, it } from 'vitest';
import {
  issuanceConfigNamesTrustAnchor,
  presentationConfigNamesTrustAnchor,
  presentationConfigTrustAnchorIds,
} from './federation-trust-anchor-reference';

describe('trust anchor references', () => {
  it('finds a trust anchor of the issuance configuration by exact entity ID', () => {
    const config = {
      federation: {
        trustAnchors: [{ entityId: 'https://ta.example', entityConfigurationUri: 'x' }],
      },
    } as unknown as IssuanceConfig;

    expect(issuanceConfigNamesTrustAnchor(config, 'https://ta.example')).toBe(true);
    expect(issuanceConfigNamesTrustAnchor(config, 'https://ta.example/')).toBe(false);
    expect(issuanceConfigNamesTrustAnchor(null, 'https://ta.example')).toBe(false);
  });

  it('collects the openid_federation values of all credential queries', () => {
    const config = {
      dcql_query: {
        credentials: [
          {
            trusted_authorities: [
              { type: 'openid_federation', values: ['https://ta.example', 7] },
              { type: 'etsi_tl', values: [{ trustListId: 'list' }] },
            ],
          },
          {
            trusted_authorities: [{ type: 'openid_federation', values: ['https://other.example'] }],
          },
          {},
        ],
      },
    } as unknown as PresentationConfig;

    expect(presentationConfigTrustAnchorIds(config)).toEqual([
      'https://ta.example',
      'https://other.example',
    ]);
    expect(presentationConfigNamesTrustAnchor(config, 'https://other.example')).toBe(true);
    expect(presentationConfigTrustAnchorIds({} as PresentationConfig)).toEqual([]);
  });
});
