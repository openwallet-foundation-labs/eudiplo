import { X509Certificate } from "node:crypto";
import type { JWK } from "jose";

/*
 * What the key chain importer derives from a document. Kept free of service
 * imports: the configuration bundle plan uses it to compare a document with
 * what its import stored.
 */

/** The private key as the importer passes it to the KMS, with the `kid` and `alg` it fills in. */
export function importedPrivateKey(
    keyChainId: string,
    key: JWK,
): JWK & { kid: string; alg: string } {
    return {
        ...key,
        kid: key.kid || `${keyChainId}-active`,
        alg: key.alg || "ES256",
    };
}

/**
 * The `crt` entries (leaf first) the importer stores: all of them for a
 * standalone key, and with rotation only the last one, the CA certificate
 * that signs the generated leaves. Undefined without entries: the importer
 * then generates a certificate.
 */
export function importedCertificates<T>(
    crt: readonly T[] | undefined,
    rotation: boolean,
): T[] | undefined {
    if (!crt || crt.length === 0) return undefined;
    return rotation ? crt.slice(-1) : [...crt];
}

/**
 * Whether the importer builds a CA chain: with rotation the key is a CA key
 * that signs generated leaves, unless the certificates are the one
 * self-signed certificate that is not a CA of a standalone key chain, as in
 * its export. That key stays the signing key and rotates itself.
 *
 * @param certificates The `crt` entries as PEM.
 */
export function importsAsCaChain(
    rotation: boolean,
    certificates: readonly string[] | undefined,
): boolean {
    return rotation && !isStandaloneCertificate(certificates);
}

function isStandaloneCertificate(
    certificates: readonly string[] | undefined,
): boolean {
    if (certificates?.length !== 1) return false;
    let certificate: X509Certificate;
    try {
        certificate = new X509Certificate(certificates[0]);
    } catch {
        // The CA path reports the parse error.
        return false;
    }
    return (
        !certificate.ca &&
        certificate.issuer === certificate.subject &&
        certificate.verify(certificate.publicKey)
    );
}

/** The host that certificates the importer generates name: the host of `PUBLIC_URL`. */
export function generatedCertificateHost(publicUrl: string): string {
    return new URL(publicUrl).hostname;
}

const RENEWAL_MARGIN_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Whether a certificate the importer generated still matches what an import
 * would generate now: more than 90 days of it are left, or more than half of
 * its validity if that is shorter, so a fresh certificate always matches,
 * and it names the host of `PUBLIC_URL` if one is given. Otherwise an import
 * of the same document generates it again. The wide margin lets an instance
 * that restarts rarely still renew in time.
 *
 * @param hostname The host a leaf or self-signed certificate must name;
 * undefined for a CA certificate, which stays a stable trust anchor.
 */
export function generatedCertificateCurrent(
    pem: string | undefined,
    hostname: string | undefined,
    now = new Date(),
): boolean {
    try {
        const certificate = new X509Certificate(pem ?? "");
        const notBefore = certificate.validFromDate.getTime();
        const notAfter = certificate.validToDate.getTime();
        const margin = Math.min(RENEWAL_MARGIN_MS, (notAfter - notBefore) / 2);
        return (
            now.getTime() <= notAfter - margin &&
            (hostname === undefined ||
                certificate.checkHost(hostname, { subject: "never" }) !==
                    undefined)
        );
    } catch {
        return false;
    }
}
