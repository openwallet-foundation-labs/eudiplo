import type { IssuanceConfig, PresentationConfig } from '@eudiplo/sdk-core';

/** The trust anchor entity IDs that `federation.trustAnchors` of the issuance configuration names. */
export function issuanceConfigTrustAnchorIds(config: IssuanceConfig | null | undefined): string[] {
  return (config?.federation?.trustAnchors ?? []).map((anchor) => anchor.entityId);
}

export function issuanceConfigNamesTrustAnchor(
  config: IssuanceConfig | null | undefined,
  entityId: string
): boolean {
  return issuanceConfigTrustAnchorIds(config).includes(entityId);
}

/** The `openid_federation` values of the configuration's DCQL credential queries. */
export function presentationConfigTrustAnchorIds(config: PresentationConfig): string[] {
  return (config.dcql_query?.credentials ?? []).flatMap((credential) =>
    (credential.trusted_authorities ?? [])
      .filter((authority) => authority.type === 'openid_federation')
      .flatMap((authority) => authority.values)
      .filter((value): value is string => typeof value === 'string')
  );
}

export function presentationConfigNamesTrustAnchor(
  config: PresentationConfig,
  entityId: string
): boolean {
  return presentationConfigTrustAnchorIds(config).includes(entityId);
}
