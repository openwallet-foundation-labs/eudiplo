/**
 * Replace `<TENANT_URL>` placeholders in a DCQL query with the tenant's
 * issuer URL (`${publicUrl}/issuers/${tenantId}`), so checks see the same
 * query the request will carry. Returns a copy; the input is not changed.
 */
export function resolveDcqlTenantUrl<T>(
    dcqlQuery: T,
    publicUrl: string,
    tenantId: string,
): T {
    if (dcqlQuery === undefined) return dcqlQuery;
    const tenantHost = `${publicUrl}/issuers/${tenantId}`;
    return JSON.parse(
        JSON.stringify(dcqlQuery).replaceAll("<TENANT_URL>", tenantHost),
    );
}
