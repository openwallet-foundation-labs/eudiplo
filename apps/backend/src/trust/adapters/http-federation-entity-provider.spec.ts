import { describe, expect, it, vi } from "vitest";
import { FederationEntityUnavailableError } from "../ports/federation-entity-provider.js";
import { HttpFederationEntityProvider } from "./http-federation-entity-provider.js";

const ENTITY_ID = "https://issuer.example.org";

const b64 = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

function entityConfiguration(
    claims: Record<string, unknown> = { iss: ENTITY_ID, sub: ENTITY_ID },
    header: Record<string, unknown> = {
        typ: "entity-statement+jwt",
        alg: "ES256",
        kid: "fed",
    },
) {
    return `${b64(header)}.${b64(claims)}.c2lnbmF0dXJl`;
}

const statement = (
    body: string,
    status = 200,
    contentType = "application/entity-statement+jwt",
) => new Response(body, { status, headers: { "content-type": contentType } });

function providerAnswering(response: Response | Error) {
    const fetch = vi.fn(async () => {
        if (response instanceof Error) throw response;
        return response;
    });
    const content = vi.fn();
    return {
        fetch,
        content,
        get: () =>
            new HttpFederationEntityProvider(
                { url: "https://trust-engine.example/", token: "secret" },
                fetch as unknown as typeof globalThis.fetch,
            ).getEntityConfiguration({
                tenantId: "tenant a",
                entityId: ENTITY_ID,
                content,
            }),
    };
}

describe("HttpFederationEntityProvider", () => {
    it("passes the trust engine's entity configuration on unchanged", async () => {
        const jwt = entityConfiguration();
        const { fetch, content, get } = providerAnswering(
            statement(`${jwt}\n`),
        );

        await expect(get()).resolves.toBe(jwt);
        const [url, init] = fetch.mock.calls[0] as unknown as [
            string,
            RequestInit,
        ];
        expect(url).toBe(
            "https://trust-engine.example/entities/tenant%20a/entity-configuration",
        );
        expect(init.method).toBe("GET");
        expect((init.headers as Record<string, string>).authorization).toBe(
            "Bearer secret",
        );
        // The trust engine builds the content; nothing is assembled locally.
        expect(content).not.toHaveBeenCalled();
    });

    it("rejects an entity configuration of another entity", async () => {
        const { get } = providerAnswering(
            statement(
                entityConfiguration({
                    iss: "https://other.example",
                    sub: "https://other.example",
                }),
            ),
        );

        await expect(get()).rejects.toThrow(
            "for https://other.example instead of https://issuer.example.org",
        );
    });

    it("rejects a JWT that is not an entity statement", async () => {
        const { get } = providerAnswering(
            statement(
                entityConfiguration(undefined, { typ: "JWT", alg: "ES256" }),
            ),
        );

        await expect(get()).rejects.toThrow("not an entity statement");
    });

    it("rejects another content type and answers that are no JWT", async () => {
        await expect(
            providerAnswering(
                statement(entityConfiguration(), 200, "application/json"),
            ).get(),
        ).rejects.toThrow("content type application/json");
        await expect(
            providerAnswering(statement("not-a-jwt")).get(),
        ).rejects.toThrow("other than a signed JWT");
    });

    it("reports failed requests and error answers as unavailable", async () => {
        await expect(
            providerAnswering(new Error("connect ECONNREFUSED")).get(),
        ).rejects.toBeInstanceOf(FederationEntityUnavailableError);
        await expect(
            providerAnswering(statement("", 401)).get(),
        ).rejects.toThrow("check FEDERATION_ENTITY_PROVIDER_TOKEN");
        await expect(
            providerAnswering(statement("", 503)).get(),
        ).rejects.toThrow("status 503");
    });

    it("sends no authorization header without a token", async () => {
        const fetch = vi.fn(async () => statement(entityConfiguration()));
        await new HttpFederationEntityProvider(
            { url: "https://trust-engine.example" },
            fetch as unknown as typeof globalThis.fetch,
        ).getEntityConfiguration({
            tenantId: "t",
            entityId: ENTITY_ID,
            content: vi.fn(),
        });
        const [, init] = fetch.mock.calls[0] as unknown as [
            string,
            RequestInit,
        ];
        expect(
            (init.headers as Record<string, string>).authorization,
        ).toBeUndefined();
    });
});
