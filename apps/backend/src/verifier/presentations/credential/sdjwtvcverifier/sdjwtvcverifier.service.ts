import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import * as x509 from "@peculiar/x509";
import { digest } from "@sd-jwt/crypto-nodejs";
import { SDJwtVcInstance, VerificationResult } from "@sd-jwt/sd-jwt-vc";
import { KbVerifier } from "@sd-jwt/types";
import { JWK } from "jose";
import { firstValueFrom } from "rxjs";
import { CryptoImplementationService } from "../../../../crypto/key/crypto-implementation/crypto-implementation.service";
import { ResolverService } from "../../../resolver/resolver.service";
import { TrustStoreService } from "../../../resolver/trust/trust-store.service";
import { VerifierOptions } from "../../../resolver/trust/types";
import {
    MatchedTrustedEntity,
    X509ValidationService,
} from "../../../resolver/trust/x509-validation.service";
import { BaseVerifierService } from "../base-verifier.service";

@Injectable()
export class SdjwtvcverifierService extends BaseVerifierService {
    protected readonly logger = new Logger(SdjwtvcverifierService.name);

    constructor(
        private readonly resolverService: ResolverService,
        private readonly cryptoService: CryptoImplementationService,
        private readonly httpService: HttpService,
        trustStore: TrustStoreService,
        private readonly x509v: X509ValidationService,
    ) {
        super(trustStore);
    }

    /**
     * Verifies an SD-JWT-VC credential.
     * Creates a fresh SDJwtVcInstance per verification to safely capture
     * the matched TrustedEntity for status list verification.
     * @param cred
     * @param options
     * @returns
     */
    verify(
        cred: string,
        options: VerifierOptions,
    ): Promise<VerificationResult> {
        // Closure to capture the matched TrustedEntity during verification
        let matchedEntity: MatchedTrustedEntity | null = null;

        // Create a fresh instance per verification to ensure thread safety
        const sdjwtInstance = new SDJwtVcInstance({
            hasher: digest,
            verifier: async (data: string, signature: string) => {
                const result = await this.verifyCredential(
                    data,
                    signature,
                    options,
                );
                matchedEntity = result.matchedEntity;
                return result.verified;
            },
            kbVerifier: this.kbVerifier.bind(this),
            statusListFetcher: this.statusListFetcher.bind(this),
            statusVerifier: (data: string, signature: string) => {
                // Verify status list JWT using the revocation cert from the same entity
                return this.verifyStatusList(
                    data,
                    signature,
                    options,
                    matchedEntity,
                );
            },
        });

        return sdjwtInstance.verify(cred, options as any);
    }

    /**
     * Verifies the SD-JWT-VC credential signature and trust chain.
     * Returns both the verification result and the matched TrustedEntity.
     *
     * data = "<b64url(header)>.<b64url(payload)>"
     * signature = "<b64url(signature)>"
     */
    private async verifyCredential(
        data: string,
        signature: string,
        options: VerifierOptions,
    ): Promise<{
        verified: boolean;
        matchedEntity: MatchedTrustedEntity | null;
    }> {
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
            if (!sigOk) return { verified: false, matchedEntity: null };

            // 2) Require x5c if policy says so
            const x5c: string[] | undefined = header?.x5c;
            if (
                options?.policy.requireX5c &&
                (!Array.isArray(x5c) || x5c.length === 0)
            )
                return { verified: false, matchedEntity: null };

            if (!x5c?.length) {
                // If you support non-x5c trust models, branch here.
                return { verified: true, matchedEntity: null };
            }

            // 3) Build trust store with TrustedEntities from LoTE
            // If no trust list source is configured, skip trust validation (like mDOC)
            const store = await this.getTrustStoreIfConfigured(
                options.trustListSource,
            );
            if (!store) {
                // No trust list configured - signature is valid, skip trust validation
                this.logger.debug(
                    "No trust list source configured, returning verified without trust validation",
                );
                return { verified: true, matchedEntity: null };
            }

            // 4) Build a validated path
            const presented = this.x509v.parseX5c(x5c);
            const leaf = presented[0];

            // Get all issuance certs from entities for path building
            const allCerts = store.entities.flatMap((e) =>
                e.services.map((s) => ({ certValue: s.certValue })),
            );
            const anchors = this.x509v.parseTrustAnchors(allCerts);

            let path: x509.X509Certificate[];
            try {
                path = await this.x509v.buildPath(leaf, presented, anchors, []);
            } catch (e: any) {
                this.logger.debug(`Chain build failed: ${e?.message ?? e}`);
                return { verified: false, matchedEntity: null };
            }

            // optional explicit time check on the built path
            const now = new Date();
            for (const c of path) {
                if (!this.x509v.isTimeValid(c, now))
                    return { verified: false, matchedEntity: null };
            }

            // 5) Match against TrustedEntities (not flat anchors)
            const pinnedMode = options.policy.pinnedCertMode ?? "leaf";

            const matchedEntity = await this.x509v.pathMatchesTrustedEntities(
                path,
                store.entities,
                pinnedMode,
            );

            if (!matchedEntity) {
                throw new Error(
                    "No trusted entity match found for presented certificate chain",
                );
            }

            // 6) OPTIONAL: revocation checks
            // Hook this up to your own CRL/OCSP implementation/policy.
            if (options.policy.revocation?.enabled) {
                // TODO: call your revocation service here
                // If failClosed and revocation info unavailable -> return false
            }

            return { verified: true, matchedEntity };
        } catch (e: any) {
            console.log(e);
            this.logger.error(`Error in verifier: ${e?.message ?? e}`);
            return { verified: false, matchedEntity: null };
        }
    }

    /**
     * Verifies the status list JWT using the revocation certificate from
     * the same TrustedEntity that issued the credential.
     *
     * This ensures that the status list is signed by the authorized revocation
     * service of the same entity that issued the credential.
     *
     * @param data The JWT data to verify (header.payload)
     * @param signature The JWT signature
     * @param options The verification options
     * @param matchedEntity The TrustedEntity that matched during credential verification
     * @returns true if the status list is validly signed by the entity's revocation cert
     */
    private async verifyStatusList(
        data: string,
        signature: string,
        options: VerifierOptions,
        matchedEntity: MatchedTrustedEntity | null,
    ): Promise<boolean> {
        try {
            // 1) Verify the signature of the status list JWT
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
                        `Status list JWT signature invalid: ${e?.message ?? e}`,
                    );
                    return false;
                });
            if (!sigOk) return false;

            // 2) If no entity was matched (no x5c in original credential),
            //    just accept the signature verification
            if (!matchedEntity) {
                return true;
            }

            // 3) Check if the matched entity has a revocation certificate
            if (!matchedEntity.revocationCert) {
                // Entity doesn't have a revocation cert, but credential had x5c
                // Depending on policy, you might want to reject this
                this.logger.warn(
                    `TrustedEntity ${matchedEntity.entity.entityId ?? "unknown"} ` +
                        `has no revocation certificate configured`,
                );
                // For now, accept if entity doesn't define a revocation cert
                return true;
            }

            // 4) Verify that status list is signed by the entity's revocation cert
            const x5c: string[] | undefined = header?.x5c;
            if (!x5c?.length) {
                // Status list doesn't have x5c, but credential did
                this.logger.warn(
                    "Status list JWT missing x5c, but credential had x5c trust chain",
                );
                return false;
            }

            // 5) Build and verify the status list's certificate chain
            const store = await this.getTrustStoreIfConfigured(
                options.trustListSource,
            );
            if (!store) {
                // No trust list configured - accept if signature is valid
                return true;
            }

            const presented = this.x509v.parseX5c(x5c);
            const leaf = presented[0];

            // Get all certs for path building
            const allCerts = store.entities.flatMap((e) =>
                e.services.map((s) => ({ certValue: s.certValue })),
            );
            const anchors = this.x509v.parseTrustAnchors(allCerts);

            let path: x509.X509Certificate[];
            try {
                path = await this.x509v.buildPath(leaf, presented, anchors, []);
            } catch (e: any) {
                this.logger.debug(
                    `Status list chain build failed: ${e?.message ?? e}`,
                );
                return false;
            }

            // 6) Get the leaf or end cert thumbprint from status list chain
            const statusLeafThumb = await this.getThumbprint(presented[0]);
            const statusEndThumb = await this.getThumbprint(path.at(-1)!);

            // 7) Check if the status list is signed by the revocation cert from the same entity
            const revocationThumb = matchedEntity.revocationThumbprint!;
            const revocationIsCa = this.x509v.isCaCert(
                matchedEntity.revocationCert,
            );

            const pinnedMode = options.policy.pinnedCertMode ?? "leaf";
            let statusMatchesRevocation = false;

            if (revocationIsCa) {
                // Revocation cert is CA: path must terminate at this cert
                statusMatchesRevocation = revocationThumb === statusEndThumb;
            } else {
                // Revocation cert is pinned (non-CA)
                if (pinnedMode === "leaf") {
                    statusMatchesRevocation =
                        revocationThumb === statusLeafThumb;
                } else if (pinnedMode === "pathEnd") {
                    statusMatchesRevocation =
                        revocationThumb === statusEndThumb;
                }
            }

            if (!statusMatchesRevocation) {
                this.logger.warn(
                    `Status list is NOT signed by the revocation certificate from the same TrustedEntity. ` +
                        `Entity: ${matchedEntity.entity.entityId ?? "unknown"}, ` +
                        `Expected revocation cert: ${revocationThumb}, ` +
                        `Status list leaf cert: ${statusLeafThumb}, ` +
                        `Status list end cert: ${statusEndThumb}`,
                );
                return false;
            }

            this.logger.debug(
                `Status list verified against revocation cert from entity: ${matchedEntity.entity.entityId ?? "unknown"}`,
            );
            return true;
        } catch (e: any) {
            this.logger.error(
                `Error verifying status list: ${e?.message ?? e}`,
            );
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
