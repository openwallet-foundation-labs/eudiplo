import type { FederationEntityProviderSettings } from "../federation-entity-provider-settings.js";
import {
    type EntityConfigurationRequest,
    type FederationEntityProvider,
    FederationEntityUnavailableError,
} from "../ports/federation-entity-provider.js";

/** A trust engine that does not answer in time must not stall the endpoint. */
export const ENTITY_PROVIDER_TIMEOUT_MS = 10_000;

/** Upper bound for one entity configuration. */
export const ENTITY_PROVIDER_MAX_BYTES = 256 * 1024;

const ENTITY_STATEMENT_MEDIA_TYPE = "application/entity-statement+jwt";

/**
 * Obtains the entity configuration from an external trust engine with
 * `GET {url}/entities/{tenantId}/entity-configuration` and passes it on
 * unchanged: decoding and signing it again would replace the trust engine's
 * signature. It is only checked to be an entity configuration of the
 * configured entity (`iss` and `sub` equal to the entity id).
 * `fetch` must apply the outbound URL policy.
 */
export class HttpFederationEntityProvider implements FederationEntityProvider {
    constructor(
        private readonly settings: Omit<
            Extract<FederationEntityProviderSettings, { type: "http" }>,
            "type"
        >,
        private readonly fetch: typeof globalThis.fetch,
    ) {}

    async getEntityConfiguration({
        tenantId,
        entityId,
    }: EntityConfigurationRequest): Promise<string> {
        const url = `${withoutTrailingSlashes(this.settings.url)}/entities/${encodeURIComponent(tenantId)}/entity-configuration`;
        let response: Response;
        try {
            response = await this.fetch(url, {
                method: "GET",
                headers: {
                    accept: ENTITY_STATEMENT_MEDIA_TYPE,
                    ...(this.settings.token
                        ? { authorization: `Bearer ${this.settings.token}` }
                        : {}),
                },
            });
        } catch (error) {
            throw new FederationEntityUnavailableError(
                `trust engine request failed: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
        if (!response.ok) {
            throw new FederationEntityUnavailableError(
                `trust engine answered with status ${response.status}${response.status === 401 || response.status === 403 ? "; check FEDERATION_ENTITY_PROVIDER_TOKEN" : ""}`,
            );
        }
        const contentType = response.headers.get("content-type");
        if (
            contentType?.split(";")[0]?.trim().toLowerCase() !==
            ENTITY_STATEMENT_MEDIA_TYPE
        ) {
            throw new FederationEntityUnavailableError(
                `trust engine answered with content type ${contentType ?? "(none)"} instead of ${ENTITY_STATEMENT_MEDIA_TYPE}`,
            );
        }

        const jwt = (await response.text()).trim();
        assertEntityConfigurationOf(jwt, entityId);
        return jwt;
    }
}

function assertEntityConfigurationOf(jwt: string, entityId: string): void {
    const parts = jwt.split(".");
    let header: Record<string, unknown> | undefined;
    let payload: Record<string, unknown> | undefined;
    if (parts.length === 3) {
        try {
            header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
            payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
        } catch {
            header = undefined;
        }
    }
    if (!header || !payload || typeof header !== "object") {
        throw new FederationEntityUnavailableError(
            "trust engine answered with something other than a signed JWT",
        );
    }
    if (header.typ !== "entity-statement+jwt") {
        throw new FederationEntityUnavailableError(
            "trust engine answered with a JWT that is not an entity statement",
        );
    }
    if (payload.iss !== entityId || payload.sub !== entityId) {
        throw new FederationEntityUnavailableError(
            `trust engine answered with an entity configuration for ${String(payload.sub)} instead of ${entityId}`,
        );
    }
}

function withoutTrailingSlashes(url: string): string {
    let end = url.length;
    while (end > 0 && url[end - 1] === "/") end--;
    return url.slice(0, end);
}
