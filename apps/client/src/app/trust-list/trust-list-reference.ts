import type { CredentialConfig, PresentationConfig, SchemaMetaConfig } from '@eudiplo/sdk-core';

/** The managed trust list a reference may name. */
export interface ManagedTrustList {
  id: string;
  tenantId: string;
}

function decoded(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * True when a URL names the managed trust list: `<TENANT_URL>/trust-list/<id>`, or a URL with
 * `/issuers/<tenant>/trust-list/<id>` such as the public URL of the list, where the tenant is the
 * list's tenant. The host is not compared, so the same tenant and id on another instance counts.
 * A list whose id only starts with the id does not count, nor does a URL without either prefix.
 */
export function urlNamesTrustList(url: string | undefined, list: ManagedTrustList): boolean {
  if (!url) return false;
  const segments = url.split(/[?#]/, 1)[0].split('/');
  if (segments.at(-1) === '') segments.pop();
  const id = segments.pop();
  if (segments.pop() !== 'trust-list' || id === undefined || decoded(id) !== list.id) return false;
  if (segments.join('/') === '<TENANT_URL>') return true;
  const tenant = segments.pop();
  return segments.pop() === 'issuers' && tenant !== undefined && decoded(tenant) === list.tenantId;
}

/**
 * True when a credential config lists the trust list in `schemaMeta.trustedAuthorities`, by
 * `trustListId` or as an `etsi_tl` authority whose value is the list id or its URL.
 */
export function credentialConfigReferencesTrustList(
  config: CredentialConfig,
  list: ManagedTrustList
): boolean {
  const authorities = (config.schemaMeta as SchemaMetaConfig | undefined)?.trustedAuthorities ?? [];
  return authorities.some(
    (ta) =>
      ta.trustListId?.trim() === list.id ||
      (ta.frameworkType === 'etsi_tl' &&
        (ta.value === list.id || urlNamesTrustList(ta.value, list)))
  );
}

/**
 * True when a credential query of the presentation config's DCQL query accepts issuers from the
 * trust list, by `trustListId` or by URL.
 */
export function presentationConfigReferencesTrustList(
  config: PresentationConfig,
  list: ManagedTrustList
): boolean {
  return (config.dcql_query?.credentials ?? []).some((credential) =>
    (credential.trusted_authorities ?? []).some(
      (authority) =>
        authority.type === 'etsi_tl' &&
        authority.values.some(
          (ref) => ref.trustListId?.trim() === list.id || urlNamesTrustList(ref.url, list)
        )
    )
  );
}
