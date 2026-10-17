import type {
    CertificateInfo,
    CertService,
} from "../../crypto/key/cert/cert.service.js";
import type { ClientIdSchemeValue } from "./dto/presentation-request.dto.js";
import { ClientIdScheme } from "./dto/presentation-request.dto.js";

/** OID4VP client identifier for an OpenID Federation entity. */
export function federationClientId(entityId: string): string {
    return `${ClientIdScheme.OPENID_FEDERATION}:${entityId}`;
}

export function isFederationClientId(clientId: string): boolean {
    return clientId.startsWith(`${ClientIdScheme.OPENID_FEDERATION}:`);
}

type ClientIdCertService = Pick<CertService, "getCertDnsName" | "getCertHash">;

export function createClientId(
    cert: CertificateInfo,
    certService: ClientIdCertService,
    scheme: ClientIdSchemeValue = ClientIdScheme.X509_HASH,
): string {
    if (scheme === ClientIdScheme.X509_SAN_DNS) {
        return `${scheme}:${certService.getCertDnsName(cert)}`;
    }

    return `${ClientIdScheme.X509_HASH}:${certService.getCertHash(cert)}`;
}
