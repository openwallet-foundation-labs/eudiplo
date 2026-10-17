import { NotFoundError } from "../../../../shared/domain/not-found-error.js";
import type { FederationEntityProvider } from "../../../../trust/ports/federation-entity-provider.js";
import { buildEntityMetadata } from "../domain/entity-metadata.js";
import type { EntityConfigurationSources } from "../ports/entity-configuration-sources.js";

/** How long a signed entity configuration is served again before it is renewed. */
export const ENTITY_CONFIGURATION_CACHE_MS = 60_000;

const MAX_CACHED_TENANTS = 1000;

export class FederationEntityNotConfiguredError extends NotFoundError {
    constructor(tenantId: string) {
        super(
            `Tenant ${tenantId} publishes no OpenID Federation entity configuration: its issuance configuration needs federation.entityId and at least one trust anchor`,
        );
        this.name = "FederationEntityNotConfiguredError";
    }
}

/** How long a failure is answered again before the next attempt. */
export const ENTITY_CONFIGURATION_FAILURE_CACHE_MS = 10_000;

type CachedEntityConfiguration = {
    version: string;
    expiresAt: number;
} & ({ jwt: string } | { error: unknown });

/**
 * The signed entity configuration of a tenant's federation entity, for
 * `/.well-known/openid-federation`. The public endpoint must not make
 * EUDIPLO sign (or ask a trust engine) on every request: a result is reused
 * for a minute, a failure for ten seconds, and concurrent requests share one
 * attempt. A change of the federation configuration takes effect at once.
 */
export class PublishEntityConfiguration {
    private readonly cache = new Map<string, CachedEntityConfiguration>();
    private readonly inFlight = new Map<string, Promise<string>>();

    constructor(
        private readonly sources: EntityConfigurationSources,
        private readonly provider: FederationEntityProvider,
        private readonly now: () => number = Date.now,
    ) {}

    async execute(tenantId: string): Promise<string> {
        const own = await this.sources.ownEntity(tenantId);
        if (!own) throw new FederationEntityNotConfiguredError(tenantId);
        const { entity, version } = own;

        const cached = this.cache.get(tenantId);
        if (
            cached &&
            cached.version === version &&
            cached.expiresAt > this.now()
        ) {
            if ("error" in cached) throw cached.error;
            return cached.jwt;
        }

        const key = `${tenantId}\u0000${version}`;
        const pending = this.inFlight.get(key);
        if (pending) return pending;

        const attempt = this.provider
            .getEntityConfiguration({
                tenantId,
                entityId: entity.entityId,
                keyChainId: entity.keyChainId,
                content: async () => ({
                    authorityHints: entity.authorityHints,
                    trustMarks: entity.trustMarks,
                    lifetimeSeconds: entity.lifetimeSeconds,
                    metadata: buildEntityMetadata({
                        entity,
                        credentialIssuer: entity.entityTypes.includes(
                            "openid_credential_issuer",
                        )
                            ? await this.sources.credentialIssuer(tenantId)
                            : undefined,
                        credentialVerifier: entity.entityTypes.includes(
                            "openid_credential_verifier",
                        )
                            ? await this.sources.credentialVerifier(tenantId)
                            : undefined,
                    }),
                }),
            })
            .then(
                (jwt) => {
                    this.store(tenantId, {
                        jwt,
                        version,
                        expiresAt: this.now() + ENTITY_CONFIGURATION_CACHE_MS,
                    });
                    return jwt;
                },
                (error: unknown) => {
                    this.store(tenantId, {
                        error,
                        version,
                        expiresAt:
                            this.now() + ENTITY_CONFIGURATION_FAILURE_CACHE_MS,
                    });
                    throw error;
                },
            )
            .finally(() => this.inFlight.delete(key));
        this.inFlight.set(key, attempt);
        return attempt;
    }

    private store(tenantId: string, entry: CachedEntityConfiguration) {
        if (
            !this.cache.has(tenantId) &&
            this.cache.size >= MAX_CACHED_TENANTS
        ) {
            const oldest = this.cache.keys().next().value;
            if (oldest !== undefined) this.cache.delete(oldest);
        }
        this.cache.set(tenantId, entry);
    }
}
