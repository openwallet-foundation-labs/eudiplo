import { Injectable } from "@nestjs/common";
import * as x509 from "@peculiar/x509";
import {
    getRevocationCert,
    ServiceTypeIdentifiers,
    TrustedEntity,
} from "./types";

type X5cInput = string[]; // base64 DER entries

function arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

function isPem(s: string): boolean {
    return s.includes("-----BEGIN CERTIFICATE-----");
}

function certFromValue(val: string | ArrayBuffer): x509.X509Certificate {
    // @peculiar/x509 accepts PEM string, base64 DER string, ArrayBuffer
    return new x509.X509Certificate(val as any);
}

/**
 * Information about the matched trust anchor from certificate chain validation.
 * @deprecated Use MatchedTrustedEntity instead
 */
export type MatchedTrustAnchor = {
    /** The matched anchor certificate */
    anchor: x509.X509Certificate;
    /** Thumbprint of the anchor certificate */
    thumbprint: string;
    /** Whether the anchor is a CA certificate */
    isCa: boolean;
    /** The mode that matched (ca, leaf-pinned, pathEnd-pinned) */
    matchMode: "ca" | "leaf-pinned" | "pathEnd-pinned";
};

/**
 * Information about a matched TrustedEntity from certificate chain validation.
 * Includes the matched issuance certificate and the associated revocation certificate
 * from the same entity.
 */
export type MatchedTrustedEntity = {
    /** The TrustedEntity that was matched */
    entity: TrustedEntity;
    /** The matched issuance certificate from this entity */
    issuanceCert: x509.X509Certificate;
    /** Thumbprint of the issuance certificate */
    issuanceThumbprint: string;
    /** Whether the issuance certificate is a CA certificate */
    issuanceIsCa: boolean;
    /** The mode that matched (ca, leaf-pinned, pathEnd-pinned) */
    matchMode: "ca" | "leaf-pinned" | "pathEnd-pinned";
    /** The revocation certificate from the same entity (if available) */
    revocationCert?: x509.X509Certificate;
    /** Thumbprint of the revocation certificate (if available) */
    revocationThumbprint?: string;
};

@Injectable()
export class X509ValidationService {
    parseX5c(x5c: X5cInput): x509.X509Certificate[] {
        return x5c.map((b64) => new x509.X509Certificate(b64));
    }

    parseTrustAnchors(
        values: Array<{ certValue: string }>,
    ): x509.X509Certificate[] {
        return values.map(({ certValue }) => {
            if (isPem(certValue)) return certFromValue(certValue);
            // could be base64 DER or something; try as-is
            return certFromValue(certValue);
        });
    }

    /**
     * Build a validated path from leaf using provided chain + anchors.
     * Returns path leaf..anchor if successful.
     */
    async buildPath(
        leaf: x509.X509Certificate,
        presentedChain: x509.X509Certificate[],
        anchors: x509.X509Certificate[],
        extraIntermediates: x509.X509Certificate[] = [],
    ): Promise<x509.X509Certificate[]> {
        const pool = [...presentedChain, ...extraIntermediates, ...anchors];
        const builder = new x509.X509ChainBuilder({ certificates: pool });
        return await builder.build(leaf);
    }

    /**
     * Determine whether anchor is a CA cert (basicConstraints CA=TRUE).
     */
    isCaCert(cert: x509.X509Certificate): boolean {
        // @peculiar/x509 provides basicConstraints extension parsing
        const bc = cert.getExtension("2.5.29.19"); // BasicConstraints
        // If missing, treat as not CA
        if (!bc) return false;
        // Peculiar returns parsed extension object with "ca" boolean for BasicConstraints
        return Boolean((bc as any).ca);
    }

    /**
     * Policy:
     * - If anchor is CA: require path terminates in that anchor
     * - If anchor is not CA: treat as pin
     *   - pinnedMode "leaf": leaf equals pinned cert
     *   - pinnedMode "pathEnd": path end equals pinned cert
     *
     * Returns the matched trust anchor info, or null if no match.
     */
    async pathMatchesAnchors(
        path: x509.X509Certificate[],
        anchors: x509.X509Certificate[],
        pinnedMode: "leaf" | "pathEnd" = "leaf",
    ): Promise<MatchedTrustAnchor | null> {
        const leaf = path[0];
        const end = path.at(-1)!;

        // Build anchorByThumb with async getThumbprint
        const anchorThumbPairs = await Promise.all(
            anchors.map(
                async (a) =>
                    [arrayBufferToHex(await a.getThumbprint()), a] as [
                        string,
                        x509.X509Certificate,
                    ],
            ),
        );
        const anchorByThumb = new Map(anchorThumbPairs);

        // CA anchors: end-of-path must be CA anchor
        const endThumb = arrayBufferToHex(await end.getThumbprint());
        if (
            anchorByThumb.has(endThumb) &&
            this.isCaCert(anchorByThumb.get(endThumb)!)
        ) {
            return {
                anchor: anchorByThumb.get(endThumb)!,
                thumbprint: endThumb,
                isCa: true,
                matchMode: "ca",
            };
        }

        // pinned anchors (non-CA)
        const leafThumb = arrayBufferToHex(await leaf.getThumbprint());
        for (const a of anchors) {
            if (this.isCaCert(a)) continue;
            const aThumb = arrayBufferToHex(await a.getThumbprint());
            if (pinnedMode === "leaf" && aThumb === leafThumb) {
                return {
                    anchor: a,
                    thumbprint: aThumb,
                    isCa: false,
                    matchMode: "leaf-pinned",
                };
            }
            if (pinnedMode === "pathEnd" && aThumb === endThumb) {
                return {
                    anchor: a,
                    thumbprint: aThumb,
                    isCa: false,
                    matchMode: "pathEnd-pinned",
                };
            }
        }
        return null;
    }

    /**
     * Basic time validity check (you may rely on chain builder already doing this,
     * but keeping it explicit is sometimes useful).
     */
    isTimeValid(cert: x509.X509Certificate, now = new Date()): boolean {
        return cert.notBefore <= now && now <= cert.notAfter;
    }

    /**
     * Match a certificate chain against TrustedEntities.
     * Returns the matched entity with its issuance and revocation certificates.
     *
     * Policy:
     * - Looks for issuance certificates (EaaIssuance service type) in each entity
     * - If issuance cert is CA: require path terminates in that anchor
     * - If issuance cert is not CA: treat as pin
     *   - pinnedMode "leaf": leaf equals pinned cert
     *   - pinnedMode "pathEnd": path end equals pinned cert
     *
     * @returns The matched entity info, or null if no match
     */
    async pathMatchesTrustedEntities(
        path: x509.X509Certificate[],
        entities: TrustedEntity[],
        pinnedMode: "leaf" | "pathEnd" = "leaf",
    ): Promise<MatchedTrustedEntity | null> {
        const leaf = path[0];
        const end = path.at(-1)!;
        const leafThumb = arrayBufferToHex(await leaf.getThumbprint());
        const endThumb = arrayBufferToHex(await end.getThumbprint());

        for (const entity of entities) {
            // Find issuance certificates in this entity
            const issuanceServices = entity.services.filter(
                (s) =>
                    s.serviceTypeIdentifier ===
                    ServiceTypeIdentifiers.EaaIssuance,
            );

            for (const issuanceSvc of issuanceServices) {
                const issuanceCert = certFromValue(issuanceSvc.certValue);
                const issuanceThumb = arrayBufferToHex(
                    await issuanceCert.getThumbprint(),
                );
                const issuanceIsCa = this.isCaCert(issuanceCert);

                let matchMode: "ca" | "leaf-pinned" | "pathEnd-pinned" | null =
                    null;

                if (issuanceIsCa) {
                    // CA cert: path must terminate at this anchor
                    if (issuanceThumb === endThumb) {
                        matchMode = "ca";
                    }
                } else if (
                    pinnedMode === "leaf" &&
                    issuanceThumb === leafThumb
                ) {
                    // Pinned cert (non-CA) - leaf mode
                    matchMode = "leaf-pinned";
                } else if (
                    pinnedMode === "pathEnd" &&
                    issuanceThumb === endThumb
                ) {
                    // Pinned cert (non-CA) - pathEnd mode
                    matchMode = "pathEnd-pinned";
                }

                if (matchMode) {
                    // Found a match! Now get the revocation cert from the same entity
                    const revocationSvc = getRevocationCert(entity);
                    let revocationCert: x509.X509Certificate | undefined;
                    let revocationThumbprint: string | undefined;

                    if (revocationSvc) {
                        revocationCert = certFromValue(revocationSvc.certValue);
                        revocationThumbprint = arrayBufferToHex(
                            await revocationCert.getThumbprint(),
                        );
                    }

                    return {
                        entity,
                        issuanceCert,
                        issuanceThumbprint: issuanceThumb,
                        issuanceIsCa,
                        matchMode,
                        revocationCert,
                        revocationThumbprint,
                    };
                }
            }
        }

        return null;
    }
}
