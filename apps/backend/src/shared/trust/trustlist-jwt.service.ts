import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { RulebookTrustListRef } from "./types";

export type DecodedJwt = { header: any; payload: any; signature: string };
@Injectable()
export class TrustListJwtService {
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
     * Hook to verify JWT signature/authenticity.
     * You can wire your existing JWT verification logic here.
     */
    verifyTrustListJwt(
        _ref: RulebookTrustListRef,
        _jwt: string,
    ): Promise<void> {
        //TODO: implement verifiction logic
        // out of scope - assume verified
        return Promise.resolve();
    }
}
