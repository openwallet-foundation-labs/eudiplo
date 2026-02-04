import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { importJWK, jwtVerify } from "jose";
import { firstValueFrom } from "rxjs";
import { RulebookTrustListRef } from "./types";

export type DecodedJwt = { header: any; payload: any; signature: string };
@Injectable()
export class TrustListJwtService {
    private readonly logger = new Logger(TrustListJwtService.name);

    constructor(private readonly httpService: HttpService) {}

    async fetchJwt(url: string, timeoutMs = 4000): Promise<string> {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const res = await firstValueFrom(
                this.httpService.get(url, {
                    signal: ctrl.signal,
                    responseType: "text",
                }),
            );
            return res.data;
        } catch (error: any) {
            if (
                error?.name === "CanceledError" ||
                error?.code === "ERR_CANCELED"
            ) {
                throw new Error(
                    `Trust list fetch timed out after ${timeoutMs}ms for URL: ${url}`,
                );
            }
            throw new Error(
                `Failed to fetch trust list from ${url}: ${error?.message || error}`,
            );
        } finally {
            clearTimeout(t);
        }
    }

    /**
     * Verify the JWT signature/authenticity using the verifier key from the reference.
     * If no verifier key is provided, verification is skipped (trust on first use).
     *
     * @param ref - The trust list reference containing the optional verifier key
     * @param jwt - The JWT string to verify
     * @throws Error if verification fails
     */
    async verifyTrustListJwt(
        ref: RulebookTrustListRef,
        jwt: string,
    ): Promise<void> {
        if (!ref.verifierKey) {
            this.logger.debug(
                `No verifier key provided for ${ref.url}, skipping signature verification`,
            );
            return;
        }

        try {
            const alg = ref.verifierKey.alg || "ES256";
            const publicKey = await importJWK(ref.verifierKey, alg);

            await jwtVerify(jwt, publicKey, {
                // Allow some clock skew (5 minutes)
                clockTolerance: 300,
            });

            this.logger.debug(
                `Successfully verified trust list JWT signature for ${ref.url}`,
            );
        } catch (error: any) {
            const message = error?.message || "Unknown verification error";
            throw new Error(
                `Trust list JWT verification failed for ${ref.url}: ${message}`,
            );
        }
    }
}
