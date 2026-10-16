import {
    OAuth2Client,
    OAuth2HttpError,
    OAuth2Token,
} from "@badgateway/oauth2-client";
import { HttpService } from "@nestjs/axios";
import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createValidationException } from "../shared/common/zod/zod-schema.util.js";
import {
    OutboundFetchError,
    outboundFetch,
} from "../webhook/outbound-fetch.js";
import { OutboundUrlPolicyService } from "../webhook/outbound-url-policy.service.js";
import { RegistrarConfigEntity } from "./entities/registrar-config.entity.js";
import { createClient, createConfig } from "./generated/client/index.js";
import {
    type ClientOptions,
    relyingPartyControllerFindAll,
    relyingPartyControllerRegister,
} from "./generated/index.js";
import { registrarErrorMessage } from "./registrar-error-message.js";

/**
 * Limits for every request to the registrar API and its OIDC provider: one
 * deadline per request including redirects and body, a response size cap,
 * and a few redirects, each checked against the outbound URL policy.
 */
const REGISTRAR_REQUEST_LIMITS = {
    timeoutMs: 30_000,
    maxBytes: 5 * 1024 * 1024,
    maxRedirects: 5,
};

/** OAuth 2.0 token error codes (RFC 6749, section 5.2) passed on to callers. */
const OAUTH2_ERROR_CODES = new Set([
    "invalid_request",
    "invalid_client",
    "invalid_grant",
    "unauthorized_client",
    "unsupported_grant_type",
    "invalid_scope",
]);

/**
 * Cached OAuth2 token with its expiration time.
 */
interface CachedToken {
    token: string;
    expiresAt: number;
    /** {@link tokenDestination} of the configuration the token was obtained with. */
    destination: string;
}

/**
 * The account a token belongs to and the addresses it is obtained from and
 * sent to. A cached token is only used for the same destination, so a token
 * that a request still in flight caches after the configuration changed
 * never reaches a new registrar URL.
 */
function tokenDestination(config: RegistrarConfigEntity): string {
    return JSON.stringify([
        config.oidcUrl,
        config.clientId,
        config.username,
        config.registrarUrl,
    ]);
}

/**
 * Handles OAuth2 token acquisition/caching and low-level registrar client
 * creation. Also provides {@link getRelyingPartyId} which is shared by both
 * access-certificate and registration-certificate flows.
 */
@Injectable()
export class RegistrarAuthService {
    private readonly logger = new Logger(RegistrarAuthService.name);

    private readonly tokenCache = new Map<string, CachedToken>();

    /** `fetch` under the outbound URL policy for all registrar requests. */
    private readonly fetch: typeof fetch;

    constructor(
        @InjectRepository(RegistrarConfigEntity)
        private readonly configRepository: Repository<RegistrarConfigEntity>,
        private readonly outboundUrlPolicy: OutboundUrlPolicyService,
        http: HttpService,
    ) {
        this.fetch = outboundFetch(
            http,
            outboundUrlPolicy,
            REGISTRAR_REQUEST_LIMITS,
        );
    }

    /**
     * Check the configured registrar and OIDC URLs against the outbound URL
     * policy, so a configuration pointing at a blocked target is rejected
     * before it is saved. The 400 names each rejected field, like a
     * validation error.
     *
     * @param options.resolveHosts `false` skips the DNS lookup, so a host
     * that does not resolve yet is accepted; the address is checked when
     * the URL is requested
     */
    async assertSafeUrls(
        urls: {
            registrarUrl?: string;
            oidcUrl?: string;
        },
        options: { resolveHosts?: boolean } = {},
    ): Promise<void> {
        const fields = (["registrarUrl", "oidcUrl"] as const).filter(
            (field) => urls[field] !== undefined,
        );
        const results = await Promise.allSettled(
            fields.map((field) =>
                this.outboundUrlPolicy.assertSafeUrl(urls[field]!, {
                    resolveHost: options.resolveHosts,
                }),
            ),
        );
        const issues = results.flatMap((result, index) =>
            result.status === "rejected"
                ? [
                      {
                          path: [fields[index]],
                          message: (result.reason as Error).message,
                          code: "outbound_url_policy",
                      },
                  ]
                : [],
        );
        if (issues.length > 0) {
            throw createValidationException(
                issues,
                `Rejected by the outbound URL policy of this instance: ${issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join("; ")}`,
            );
        }
    }

    /**
     * Test OIDC credentials by attempting to obtain an access token.
     * @throws BadRequestException if authentication fails
     */
    async testCredentials(config: {
        oidcUrl: string;
        clientId: string;
        clientSecret?: string | null;
        username: string;
        password: string;
    }): Promise<void> {
        const oauth2Client = await this.createOAuth2Client(config);

        try {
            await oauth2Client.password({
                username: config.username,
                password: config.password,
            });
            this.logger.log("Registrar credentials validated successfully");
        } catch (error: any) {
            this.logger.warn(
                { err: error },
                "Registrar credential check did not return a token",
            );
            // Only management callers get here, so the reason names URLs.
            const reason = this.tokenFailureReason(error, true);
            if (error instanceof OAuth2HttpError) {
                throw new BadRequestException(
                    `Invalid registrar credentials: ${reason}. Please check your username, password, client ID and secret.`,
                );
            }
            if (error instanceof OutboundFetchError && error.blocked) {
                throw new BadRequestException(
                    `Registrar credentials could not be verified: ${reason}`,
                );
            }
            throw new ServiceUnavailableException(
                `Registrar credentials could not be verified: ${reason}`,
            );
        }
    }

    /**
     * Get or refresh the access token for a tenant configuration using the
     * ROPC flow.
     */
    private async getAccessToken(
        config: RegistrarConfigEntity,
    ): Promise<string> {
        const { tenantId } = config;
        const destination = tokenDestination(config);
        const cached = this.tokenCache.get(tenantId);
        if (
            cached?.destination === destination &&
            cached.expiresAt > Date.now() + 5000
        ) {
            return cached.token;
        }

        const oauth2Client = await this.createOAuth2Client(config);

        let tokenResponse: OAuth2Token;
        try {
            tokenResponse = await oauth2Client.password({
                username: config.username,
                password: config.password,
            });
        } catch (error: any) {
            this.logger.error(
                { err: error },
                `[${tenantId}] Failed to obtain access token`,
            );
            // Wallets can reach this through the OID4VP request object,
            // which may need a registration certificate, so no URLs.
            throw new BadRequestException(
                `Failed to authenticate with registrar: ${this.tokenFailureReason(error, false)}`,
            );
        }

        const expiresAt =
            typeof tokenResponse.expiresAt === "number"
                ? tokenResponse.expiresAt
                : Date.now() + 3600 * 1000;

        this.tokenCache.set(tenantId, {
            token: tokenResponse.accessToken,
            expiresAt,
            destination,
        });

        return tokenResponse.accessToken;
    }

    /**
     * Create a registrar API client for the given tenant. Each call gets its
     * own client, so concurrent requests of other tenants cannot change its
     * URL or token.
     */
    async getClient(tenantId: string) {
        return this.clientFor(await this.getConfigOrThrow(tenantId));
    }

    private async getConfigOrThrow(
        tenantId: string,
    ): Promise<RegistrarConfigEntity> {
        const config = await this.configRepository.findOneBy({ tenantId });
        if (!config) {
            throw new NotFoundException(
                `No registrar configuration found for tenant ${tenantId}`,
            );
        }
        return config;
    }

    /** A registrar API client authenticated with the credentials of `config`. */
    private async clientFor(config: RegistrarConfigEntity) {
        // Checked before the token is requested, so no credentials are sent
        // for a configuration whose registrar URL is blocked.
        await this.outboundUrlPolicy.assertSafeUrl(config.registrarUrl);
        const accessToken = await this.getAccessToken(config);

        return createClient(
            createConfig<ClientOptions>({
                baseUrl: config.registrarUrl,
                auth: () => accessToken,
                fetch: this.fetch,
            }),
        );
    }

    /**
     * Get the relying party ID from the registrar.
     * If none exists yet, one is registered on the fly with the contact of
     * the registrar configuration. An existing relying party is used as it
     * is: the registrar has no request to change its contact.
     */
    async getRelyingPartyId(tenantId: string): Promise<string> {
        const config = await this.getConfigOrThrow(tenantId);
        const client = await this.clientFor(config);

        const res = await relyingPartyControllerFindAll({ client });
        if (res.error) {
            this.logger.error(
                { error: res.error },
                `[${tenantId}] Failed to fetch relying parties`,
            );
            throw new BadRequestException(
                "Failed to fetch relying parties from registrar",
            );
        }

        const relyingParties = res.data || [];
        if (relyingParties.length === 0) {
            const contact = config.relyingPartyContact;
            const createRes = await relyingPartyControllerRegister({
                client,
                body: {
                    supportUri: contact?.supportUri,
                    email: contact?.email,
                    phone: contact?.phone,
                },
            });
            if (createRes.error) {
                this.logger.error(
                    { error: createRes.error },
                    `[${tenantId}] Failed to register relying party`,
                );
                throw new BadRequestException(
                    `Failed to register relying party at registrar: ${registrarErrorMessage(createRes.error)}`,
                );
            }
            return createRes.data!.id;
        }

        return relyingParties[0].id;
    }

    /**
     * OAuth2 client for the registrar's OIDC provider. The discovery document
     * can name a token endpoint on any host, so the client's own requests go
     * through the outbound URL policy too.
     */
    private async createOAuth2Client(config: {
        oidcUrl: string;
        clientId: string;
        clientSecret?: string | null;
    }): Promise<OAuth2Client> {
        await this.outboundUrlPolicy.assertSafeUrl(config.oidcUrl);
        return new OAuth2Client({
            server: `${config.oidcUrl}/protocol/openid-connect/token`,
            clientId: config.clientId,
            clientSecret: config.clientSecret ?? undefined,
            discoveryEndpoint: `${config.oidcUrl}/.well-known/openid-configuration`,
            fetch: this.fetch,
        });
    }

    /**
     * Why the OIDC provider gave no token, in words that may reach the API
     * caller: the HTTP status with a registered OAuth2 error code, or why a
     * policy-checked request failed. With `withUrls`, that is the request's
     * message, which names URLs but no addresses. Anything else, such as an
     * answer without an access token, is described only; the log keeps the
     * error.
     */
    private tokenFailureReason(error: unknown, withUrls: boolean): string {
        if (error instanceof OAuth2HttpError) {
            const code = OAUTH2_ERROR_CODES.has(error.oauth2Code)
                ? `, ${error.oauth2Code}`
                : "";
            return `the OIDC provider answered with HTTP ${error.httpCode}${code}`;
        }
        if (error instanceof OutboundFetchError) {
            if (withUrls) return error.message;
            return error.blocked
                ? "the outbound URL policy blocks a request to the OIDC provider"
                : "the OIDC provider could not be reached";
        }
        return "the OIDC provider did not answer with an access token; the server log has the cause";
    }

    /**
     * Remove the cached token for a tenant (e.g. after config changes).
     */
    invalidateToken(tenantId: string): void {
        this.tokenCache.delete(tenantId);
    }
}
