import { createPublicKey, X509Certificate } from "node:crypto";
import type { JWK } from "jose";

/*
 * PEM certificate helpers without service imports, shared by the key chain
 * importer and the configuration bundle plan that compares with what an
 * import stored.
 */

const PEM_BEGIN = "-----BEGIN CERTIFICATE-----";
const PEM_END = "-----END CERTIFICATE-----";

// Avoids a backtracking-prone `=+$` regex by trimming padding with a bounded loop.
function stripTrailingPadding(value: string): string {
    let end = value.length;
    while (end > 0 && value[end - 1] === "=") {
        end -= 1;
    }
    return value.slice(0, end);
}

/**
 * A certificate in PEM or base64 DER as PEM: PEM is kept as given, DER gets
 * canonical PEM formatting with 64-character lines. Throws for anything else.
 */
export function certificateEntryToPem(value: string): string {
    const trimmed = value.trim();
    if (trimmed.includes(PEM_BEGIN) && trimmed.includes(PEM_END)) {
        return trimmed;
    }

    const normalized = trimmed.replace(/\s+/g, "");
    const der = Buffer.from(normalized, "base64");
    if (der.length === 0) {
        throw new Error("decoded certificate is empty");
    }

    // Ensure the string was valid base64 before PEM wrapping.
    const canonical = stripTrailingPadding(der.toString("base64"));
    if (canonical !== stripTrailingPadding(normalized)) {
        throw new Error("input is not valid base64 DER");
    }

    const body =
        der
            .toString("base64")
            .match(/.{1,64}/g)
            ?.join("\n") ?? "";
    return `${PEM_BEGIN}\n${body}\n${PEM_END}`;
}

/** The certificates of a PEM chain, one PEM block each. */
export function pemCertificates(pem: string): string[] {
    const certs: string[] = [];
    for (const part of pem.split(PEM_END)) {
        const trimmed = part.trim();
        if (trimmed.includes(PEM_BEGIN)) {
            certs.push(`${trimmed}\n${PEM_END}`);
        }
    }
    return certs;
}

/**
 * Whether a PEM certificate is self-signed with the given key: issued by its
 * own subject, for that key and signed with it.
 */
export function isSelfSignedCertificate(pem: string, key: JWK): boolean {
    try {
        const certificate = new X509Certificate(pem);
        // Not checkIssued: it also requires keyCertSign, which leaf certificates lack.
        return (
            certificate.issuer === certificate.subject &&
            certificate.publicKey.equals(
                createPublicKey({ key: key as JsonWebKey, format: "jwk" }),
            ) &&
            certificate.verify(certificate.publicKey)
        );
    } catch {
        return false;
    }
}
