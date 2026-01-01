import { Injectable } from "@nestjs/common";
//import { Crypto } from "@peculiar/webcrypto";
import * as x509 from "@peculiar/x509";

//x509.cryptoProvider.set(new Crypto());

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
     */
    async pathMatchesAnchors(
        path: x509.X509Certificate[],
        anchors: x509.X509Certificate[],
        pinnedMode: "leaf" | "pathEnd" = "leaf",
    ): Promise<boolean> {
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
            return true;
        }

        // pinned anchors (non-CA)
        const leafThumb = arrayBufferToHex(await leaf.getThumbprint());
        for (const a of anchors) {
            if (this.isCaCert(a)) continue;
            const aThumb = arrayBufferToHex(await a.getThumbprint());
            if (pinnedMode === "leaf" && aThumb === leafThumb) return true;
            if (pinnedMode === "pathEnd" && aThumb === endThumb) return true;
        }
        return false;
    }

    /**
     * Basic time validity check (you may rely on chain builder already doing this,
     * but keeping it explicit is sometimes useful).
     */
    isTimeValid(cert: x509.X509Certificate, now = new Date()): boolean {
        return cert.notBefore <= now && now <= cert.notAfter;
    }
}
