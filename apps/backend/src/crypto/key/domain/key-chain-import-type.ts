import { X509Certificate } from "node:crypto";

/** The key chain types of `POST /api/key-chain`, import and export. */
export const KEY_CHAIN_TYPES = ["standalone", "internalChain"] as const;
export type ImportedKeyChainType = (typeof KEY_CHAIN_TYPES)[number];

/**
 * Whether an import makes `key` the signing key of a standalone key chain or
 * the CA key of an internal chain. `type` decides. Without it, as in exports
 * before key chain format v2, `key` is a CA key only with rotation enabled,
 * unless `crt` is the self-signed certificate of a standalone key chain. Kept
 * free of service imports: the configuration bundle plan uses it to report
 * what the import will store.
 */
export function importedKeyChainType(dto: {
    type?: ImportedKeyChainType;
    crt?: string[];
    rotationPolicy?: { enabled?: boolean } | null;
}): ImportedKeyChainType {
    if (dto.type) return dto.type;
    return dto.rotationPolicy?.enabled && !isStandaloneCertificate(dto.crt)
        ? "internalChain"
        : "standalone";
}

/**
 * True for a single self-signed certificate (PEM or base64 DER) that is not a
 * CA, as a standalone key chain has. It cannot sign the leaves of a CA chain.
 */
function isStandaloneCertificate(certificates?: string[]): boolean {
    if (certificates?.length !== 1) return false;
    const [entry] = certificates;
    let certificate: X509Certificate;
    try {
        certificate = new X509Certificate(
            entry.includes("-----BEGIN CERTIFICATE-----")
                ? entry
                : Buffer.from(entry.replaceAll(/\s+/g, ""), "base64"),
        );
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
