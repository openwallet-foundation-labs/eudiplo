import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import * as x509 from "@peculiar/x509";
import { digest } from "@sd-jwt/crypto-nodejs";
import { SDJwtVcInstance, VerificationResult } from "@sd-jwt/sd-jwt-vc";
import { KbVerifier } from "@sd-jwt/types";
import { JWK } from "jose";
import { firstValueFrom } from "rxjs";
import { Logger } from "testcontainers/build/common/logger";
import { CryptoImplementationService } from "../../../../crypto/key/crypto-implementation/crypto-implementation.service";
import { ResolverService } from "../../../resolver/resolver.service";
import { TrustStoreService } from "../../../resolver/trust/trust-store.service";
import { VerifierOptions } from "../../../resolver/trust/types";
import { X509ValidationService } from "../../../resolver/trust/x509-validation.service";

@Injectable()
export class SdjwtvcverifierService {
    /**
     * Instance of SD-JWT-VC for verification.
     */
    private readonly sdjwtInstance: SDJwtVcInstance;

    private readonly logger = new Logger(SdjwtvcverifierService.name);

    constructor(
        private readonly resolverService: ResolverService,
        private readonly cryptoService: CryptoImplementationService,
        private readonly httpService: HttpService,
        private readonly trustStore: TrustStoreService,
        private readonly x509v: X509ValidationService,
    ) {
        this.sdjwtInstance = new SDJwtVcInstance({
            hasher: digest,
            verifier: this.verifier.bind(this),
            kbVerifier: this.kbVerifier.bind(this),
            statusListFetcher: this.statusListFetcher.bind(this),
        });
    }

    /**
     * Verifies an SD-JWT-VC credential.
     * @param cred
     * @param options
     * @returns
     */
    verify(cred: string, options: any): Promise<VerificationResult> {
        return this.sdjwtInstance.verify(cred, options);
    }

    /**
     * data = "<b64url(header)>.<b64url(payload)>"
     * signature = "<b64url(signature)>"
     */
    async verifier(
        data: string,
        signature: string,
        options: VerifierOptions,
    ): Promise<boolean> {
        try {
            // 1) Verify SD-JWT signature first (fast fail)
            const [headerB64] = data.split(".");
            const headerJson = Buffer.from(
                headerB64.replaceAll("-", "+").replaceAll("_", "/"),
                "base64",
            ).toString("utf8");
            const header = JSON.parse(headerJson);
            const publicKey =
                await this.resolverService.resolvePublicKey(header);
            const crypto = this.cryptoService.getCryptoFromJwk(publicKey);
            const verifier = await crypto.getVerifier(publicKey);

            const sigOk = await verifier(data, signature)
                .then(() => true)
                .catch((e) => {
                    this.logger.debug(
                        `SD-JWT signature invalid: ${e?.message ?? e}`,
                    );
                    return false;
                });
            if (!sigOk) return false;

            // 2) Require x5c if policy says so
            const x5c: string[] | undefined = header?.x5c;
            if (
                options?.policy.requireX5c &&
                (!Array.isArray(x5c) || x5c.length === 0)
            )
                return false;

            if (!x5c?.length) {
                // If you support non-x5c trust models, branch here.
                return true;
            }

            // 3) Build trust anchors from LoTE
            const store = await this.trustStore.getTrustStore(
                options.trustListSource,
            );
            // optionally enforce NextUpdate freshness if present
            if (store.nextUpdate) {
                const nu = new Date(store.nextUpdate);
                if (!Number.isNaN(nu.getTime()) && nu.getTime() < Date.now()) {
                    this.logger.warn(
                        `Trust list NextUpdate is in the past: ${store.nextUpdate}`,
                    );
                    return false;
                }
            }

            // 4) Build a validated path and match against anchors
            const presented = this.x509v.parseX5c(x5c);
            const leaf = presented[0];

            const anchors = this.x509v.parseTrustAnchors(store.anchors);

            let path: x509.X509Certificate[];
            try {
                path = await this.x509v.buildPath(leaf, presented, anchors, []);
            } catch (e: any) {
                this.logger.debug(`Chain build failed: ${e?.message ?? e}`);
                return false;
            }

            // optional explicit time check on the built path
            const now = new Date();
            for (const c of path) {
                if (!this.x509v.isTimeValid(c, now)) return false;
            }

            const pinnedMode = options.policy.pinnedCertMode ?? "leaf";

            const anchored = await this.x509v.pathMatchesAnchors(
                path,
                anchors,
                pinnedMode,
            );

            if (!anchored) {
                throw new Error(
                    "No trust anchor match found for presented certificate chain",
                );
            }

            // 6) OPTIONAL: revocation checks
            // Hook this up to your own CRL/OCSP implementation/policy.
            if (options.policy.revocation?.enabled) {
                // TODO: call your revocation service here
                // If failClosed and revocation info unavailable -> return false
            }

            return true;
        } catch (e) {
            console.log(e);
            this.logger.error(`Error in verifier: ${e?.message ?? e}`);
            return false;
        }
    }

    /**
     * Fetch the status list from the uri.
     * @param uri
     * @returns
     */
    private readonly statusListFetcher: (uri: string) => Promise<string> = (
        uri: string,
    ) => {
        return firstValueFrom(this.httpService.get<string>(uri)).then(
            (res) => res.data,
        );
    };

    /**
     * Verifier for keybindings. It will verify the signature of the keybinding and return true if it is valid.
     * @param data
     * @param signature
     * @param payload
     * @returns
     */
    private readonly kbVerifier: KbVerifier = async (
        data,
        signature,
        payload,
    ) => {
        if (!payload.cnf) {
            throw new Error("No cnf found in the payload");
        }
        const jwk: JWK = (payload.cnf as any).jwk;
        const crypto = this.cryptoService.getCryptoFromJwk(jwk);
        const verifier = await crypto.getVerifier(jwk);
        return verifier(data, signature);
    };
}
