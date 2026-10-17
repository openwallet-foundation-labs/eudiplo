import { HttpService } from "@nestjs/axios";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { KeyChainService } from "../crypto/key/key-chain.service.js";
import { OutboundUrlPolicyService } from "../webhook/outbound-url-policy.service.js";
import { HttpFederationEntityProvider } from "./adapters/http-federation-entity-provider.js";
import { HttpFederationResolver } from "./adapters/http-federation-resolver.js";
import { LocalFederationEntityProvider } from "./adapters/local-federation-entity-provider.js";
import { LocalFederationResolver } from "./adapters/local-federation-resolver.js";
import {
    FEDERATION_ENTITY_PROVIDER_SETTINGS,
    type FederationEntityProviderSettings,
} from "./federation-entity-provider-settings.js";
import {
    FEDERATION_RESOLVER_SETTINGS,
    type FederationResolverSettings,
} from "./federation-resolver-settings.js";
import { FEDERATION_ENTITY_PROVIDER } from "./ports/federation-entity-provider.js";
import { FEDERATION_RESOLVER } from "./ports/federation-resolver.js";
import {
    federationEntityProvider,
    federationResolverProvider,
} from "./trust.module.js";
import { TrustFetchService } from "./trust-fetch.service.js";

describe("TrustModule wiring", () => {
    async function resolverFor(settings: FederationResolverSettings) {
        const moduleRef = await Test.createTestingModule({
            providers: [
                { provide: FEDERATION_RESOLVER_SETTINGS, useValue: settings },
                { provide: TrustFetchService, useValue: { get: () => {} } },
                { provide: HttpService, useValue: {} },
                { provide: OutboundUrlPolicyService, useValue: {} },
                federationResolverProvider,
            ],
        }).compile();
        return moduleRef.get(FEDERATION_RESOLVER);
    }

    it("resolves trust chains locally by default", async () => {
        await expect(
            resolverFor({ type: "local", clockToleranceSeconds: 5 }),
        ).resolves.toBeInstanceOf(LocalFederationResolver);
    });

    it("delegates to a trust engine with FEDERATION_RESOLVER=http", async () => {
        await expect(
            resolverFor({ type: "http", url: "https://trust-engine.example" }),
        ).resolves.toBeInstanceOf(HttpFederationResolver);
    });

    async function entityProviderFor(
        settings: FederationEntityProviderSettings,
    ) {
        const moduleRef = await Test.createTestingModule({
            providers: [
                {
                    provide: FEDERATION_ENTITY_PROVIDER_SETTINGS,
                    useValue: settings,
                },
                { provide: KeyChainService, useValue: {} },
                { provide: HttpService, useValue: {} },
                { provide: OutboundUrlPolicyService, useValue: {} },
                federationEntityProvider,
            ],
        }).compile();
        return moduleRef.get(FEDERATION_ENTITY_PROVIDER);
    }

    it("signs the entity configuration locally by default", async () => {
        await expect(
            entityProviderFor({ type: "local" }),
        ).resolves.toBeInstanceOf(LocalFederationEntityProvider);
    });

    it("obtains the entity configuration from a trust engine with FEDERATION_ENTITY_PROVIDER=http", async () => {
        await expect(
            entityProviderFor({
                type: "http",
                url: "https://trust-engine.example",
            }),
        ).resolves.toBeInstanceOf(HttpFederationEntityProvider);
    });
});
