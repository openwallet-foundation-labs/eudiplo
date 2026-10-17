import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { federationKey } from "../federation/federation-fixture.js";
import { setupPresentationTestApp } from "../utils.js";

describe("Federation trust anchors", () => {
    let app: INestApplication<App>;
    let authToken: string;

    beforeAll(async () => {
        const ctx = await setupPresentationTestApp();
        app = ctx.app;
        authToken = ctx.authToken;
    });

    afterAll(async () => {
        await app?.close();
    });

    const api = () => ({
        get: (path: string) =>
            request(app.getHttpServer())
                .get(path)
                .trustLocalhost()
                .set("Authorization", `Bearer ${authToken}`),
        post: (path: string, body: object) =>
            request(app.getHttpServer())
                .post(path)
                .trustLocalhost()
                .set("Authorization", `Bearer ${authToken}`)
                .send(body),
        patch: (path: string, body: object) =>
            request(app.getHttpServer())
                .patch(path)
                .trustLocalhost()
                .set("Authorization", `Bearer ${authToken}`)
                .send(body),
        delete: (path: string) =>
            request(app.getHttpServer())
                .delete(path)
                .trustLocalhost()
                .set("Authorization", `Bearer ${authToken}`),
    });

    test("registers, lists, updates, exports and deletes a trust anchor", async () => {
        const key = await federationKey("ta-1");
        const anchor = {
            id: "crud-ta",
            entityId: "https://crud-ta.example.org",
            description: "Test federation",
            jwks: { keys: [key.jwk] },
        };

        await api()
            .post("/federation-trust-anchor", anchor)
            .expect(201)
            .expect((res) => expect(res.body).toMatchObject(anchor));
        await api()
            .get("/federation-trust-anchor")
            .expect(200)
            .expect((res) =>
                expect(res.body).toContainEqual(
                    expect.objectContaining({ id: "crud-ta" }),
                ),
            );

        const rotated = await federationKey("ta-2");
        await api()
            .patch("/federation-trust-anchor/crud-ta", {
                jwks: { keys: [key.jwk, rotated.jwk] },
            })
            .expect(200)
            .expect((res) => expect(res.body.jwks.keys).toHaveLength(2));

        await api()
            .get(
                "/config-bundles/resources/FederationTrustAnchor/crud-ta/document",
            )
            .expect(200)
            .expect((res) =>
                expect(res.body).toMatchObject({
                    $schema:
                        "https://eudiplo.dev/schemas/v1/FederationTrustAnchorConfigFile.schema.json",
                    spec: {
                        id: "crud-ta",
                        entityId: anchor.entityId,
                        jwks: { keys: [key.jwk, rotated.jwk] },
                    },
                }),
            );

        await api().delete("/federation-trust-anchor/crud-ta").expect(204);
        await api().get("/federation-trust-anchor/crud-ta").expect(404);
    });

    test("registers an entity ID only once", async () => {
        const key = await federationKey("ta-1");
        const anchor = {
            id: "unique-ta",
            entityId: "https://unique-ta.example.org",
            jwks: { keys: [key.jwk] },
        };
        await api().post("/federation-trust-anchor", anchor).expect(201);

        await api()
            .post("/federation-trust-anchor", { ...anchor, id: "unique-ta-2" })
            .expect(409);
        await api().post("/federation-trust-anchor", anchor).expect(409);

        await api()
            .post("/federation-trust-anchor", {
                ...anchor,
                id: "other-ta",
                entityId: "https://other-ta.example.org",
            })
            .expect(201);
        await api()
            .patch("/federation-trust-anchor/other-ta", {
                entityId: anchor.entityId,
            })
            .expect(409);
        // Its own entity ID is no conflict; null clears the description.
        await api()
            .patch("/federation-trust-anchor/other-ta", {
                entityId: "https://other-ta.example.org",
                description: null,
            })
            .expect(200)
            .expect((res) => expect(res.body.description).toBeNull());
        await api()
            .patch("/federation-trust-anchor/unknown", { description: "x" })
            .expect(404);
        await api().delete("/federation-trust-anchor/unknown").expect(404);
    });

    test("accepts only public keys with kid and https entity IDs", async () => {
        const key = await federationKey("ta-1");
        const post = (body: object) =>
            api().post("/federation-trust-anchor", {
                id: "invalid-ta",
                entityId: "https://invalid-ta.example.org",
                jwks: { keys: [key.jwk] },
                ...body,
            });

        await post({ jwks: { keys: [{ ...key.jwk, d: "private" }] } }).expect(
            400,
        );
        const { kid: _, ...withoutKid } = key.jwk;
        await post({ jwks: { keys: [withoutKid] } }).expect(400);
        await post({ jwks: { keys: [] } }).expect(400);
        await post({ entityId: "http://invalid-ta.example.org" }).expect(400);
        await post({ entityId: "https://invalid-ta.example.org?x=1" }).expect(
            400,
        );
    });
});
