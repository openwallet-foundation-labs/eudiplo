import { join, resolve } from "node:path";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Role } from "../src/auth/roles/role.enum";
import { ResponseType } from "../src/verifier/oid4vp/dto/presentation-request.dto";
import { PresentationConfigCreateDto } from "../src/verifier/presentations/dto/presentation-config-create.dto";
import { IssuanceTestContext, readConfig, setupIssuanceTestApp } from "./utils";

describe("Client Resource-Level Access Control (e2e)", () => {
    let ctx: IssuanceTestContext;
    let adminToken: string;
    let restrictedClientToken: string;
    let unrestrictedClientToken: string;

    beforeAll(async () => {
        // Use the shared test setup that creates tenant, keys, certs, and configs
        ctx = await setupIssuanceTestApp();
        adminToken = ctx.authToken;

        // Add some presentation configs that are needed for the tests
        const configFolder = resolve(__dirname + "/../../../assets/config");

        // Import presentation configs
        await request(ctx.app.getHttpServer())
            .post("/verifier/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${adminToken}`)
            .send(
                readConfig<PresentationConfigCreateDto>(
                    join(configFolder, "root/presentation/pid-no-hook.json"),
                ),
            )
            .expect(201);

        await request(ctx.app.getHttpServer())
            .post("/verifier/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${adminToken}`)
            .send(
                readConfig<PresentationConfigCreateDto>(
                    join(configFolder, "root/presentation/pid.json"),
                ),
            )
            .expect(201);

        // Create restricted client (can only use specific configs)
        await createRestrictedClient(ctx.app);

        // Create unrestricted client (can use all configs)
        await createUnrestrictedClient(ctx.app);
    });

    afterAll(async () => {
        await ctx.app.close();
    });

    async function createRestrictedClient(app: INestApplication<App>) {
        // Create a client that can only use specific configs
        await request(app.getHttpServer())
            .post("/client")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                clientId: "restricted-client",
                roles: [Role.PresentationOffer, Role.IssuanceOffer],
                allowedPresentationConfigs: ["pid-no-hook"], // Can only use pid-no-hook
                allowedIssuanceConfigs: ["pid"], // Can only use pid
            })
            .expect(201);

        // Get the client secret first
        const clientRes = await request(app.getHttpServer())
            .get("/client/restricted-client/secret")
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        const restrictedTokenRes = await request(app.getHttpServer())
            .post("/oauth2/token")
            .send({
                client_id: "restricted-client",
                client_secret: clientRes.body.secret,
                grant_type: "client_credentials",
            })
            .expect(201);

        restrictedClientToken = restrictedTokenRes.body.access_token;
    }

    async function createUnrestrictedClient(app: INestApplication<App>) {
        // Create a client without config restrictions
        await request(app.getHttpServer())
            .post("/client")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                clientId: "unrestricted-client",
                roles: [Role.PresentationOffer, Role.IssuanceOffer],
                // No allowedPresentationConfigs or allowedIssuanceConfigs
            })
            .expect(201);

        // Get the client secret
        const clientRes = await request(app.getHttpServer())
            .get("/client/unrestricted-client/secret")
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        const unrestrictedTokenRes = await request(app.getHttpServer())
            .post("/oauth2/token")
            .send({
                client_id: "unrestricted-client",
                client_secret: clientRes.body.secret,
                grant_type: "client_credentials",
            })
            .expect(201);

        unrestrictedClientToken = unrestrictedTokenRes.body.access_token;
    }

    describe("Presentation Offer Authorization", () => {
        test("restricted client can create offer for allowed presentation config", async () => {
            const res = await request(ctx.app.getHttpServer())
                .post("/verifier/offer")
                .set("Authorization", `Bearer ${restrictedClientToken}`)
                .send({
                    response_type: ResponseType.URI,
                    requestId: "pid-no-hook", // This is in allowedPresentationConfigs
                });

            expect(res.status).toBe(201);
            expect(res.body.uri).toBeDefined();
        });

        test("restricted client cannot create offer for disallowed presentation config", async () => {
            const res = await request(ctx.app.getHttpServer())
                .post("/verifier/offer")
                .set("Authorization", `Bearer ${restrictedClientToken}`)
                .send({
                    response_type: ResponseType.URI,
                    requestId: "pid", // This is NOT in allowedPresentationConfigs
                });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain(
                "Client is not authorized to use presentation config",
            );
        });

        test("unrestricted client can create offer for any presentation config", async () => {
            // Test with pid-no-hook
            const res1 = await request(ctx.app.getHttpServer())
                .post("/verifier/offer")
                .set("Authorization", `Bearer ${unrestrictedClientToken}`)
                .send({
                    response_type: ResponseType.URI,
                    requestId: "pid-no-hook",
                });

            expect(res1.status).toBe(201);

            // Test with pid
            const res2 = await request(ctx.app.getHttpServer())
                .post("/verifier/offer")
                .set("Authorization", `Bearer ${unrestrictedClientToken}`)
                .send({
                    response_type: ResponseType.URI,
                    requestId: "pid",
                });

            expect(res2.status).toBe(201);
        });
    });

    describe("Issuance Offer Authorization", () => {
        test("restricted client can create offer for allowed issuance config", async () => {
            const res = await request(ctx.app.getHttpServer())
                .post("/issuer/offer")
                .set("Authorization", `Bearer ${restrictedClientToken}`)
                .send({
                    response_type: ResponseType.URI,
                    credentialConfigurationIds: ["pid"], // This is in allowedIssuanceConfigs
                    flow: "pre_authorized_code",
                });

            expect(res.status).toBe(201);
        });

        test("restricted client cannot create offer for disallowed issuance config", async () => {
            const res = await request(ctx.app.getHttpServer())
                .post("/issuer/offer")
                .set("Authorization", `Bearer ${restrictedClientToken}`)
                .send({
                    response_type: ResponseType.URI,
                    credentialConfigurationIds: ["citizen"], // This is NOT in allowedIssuanceConfigs
                    flow: "pre_authorized_code",
                });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain(
                "Client is not authorized to use issuance config",
            );
        });

        test("restricted client cannot create offer if any config is disallowed", async () => {
            const res = await request(ctx.app.getHttpServer())
                .post("/issuer/offer")
                .set("Authorization", `Bearer ${restrictedClientToken}`)
                .send({
                    response_type: ResponseType.URI,
                    credentialConfigurationIds: ["pid", "citizen"], // citizen is not allowed
                    flow: "pre_authorized_code",
                });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain("citizen");
        });

        test("unrestricted client can create offer for any issuance config", async () => {
            // Test with pid
            const res1 = await request(ctx.app.getHttpServer())
                .post("/issuer/offer")
                .set("Authorization", `Bearer ${unrestrictedClientToken}`)
                .send({
                    response_type: ResponseType.URI,
                    credentialConfigurationIds: ["pid"],
                    flow: "pre_authorized_code",
                });

            expect(res1.status).toBe(201);

            // Test with citizen
            const res2 = await request(ctx.app.getHttpServer())
                .post("/issuer/offer")
                .set("Authorization", `Bearer ${unrestrictedClientToken}`)
                .send({
                    response_type: ResponseType.URI,
                    credentialConfigurationIds: ["citizen"],
                    flow: "pre_authorized_code",
                });

            expect(res2.status).toBe(201);
        });
    });

    describe("Client Management", () => {
        test("client entity includes allowed config fields", async () => {
            const res = await request(ctx.app.getHttpServer())
                .get("/client/restricted-client")
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            expect(res.body.allowedPresentationConfigs).toEqual([
                "pid-no-hook",
            ]);
            expect(res.body.allowedIssuanceConfigs).toEqual(["pid"]);
        });

        test("can update client allowed configs", async () => {
            // Update the restricted client to allow different configs
            await request(ctx.app.getHttpServer())
                .patch("/client/restricted-client")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    roles: [Role.PresentationOffer, Role.IssuanceOffer],
                    allowedPresentationConfigs: ["pid", "pid-no-hook"], // Add pid
                    allowedIssuanceConfigs: ["pid", "citizen"], // Add citizen
                })
                .expect(200);

            // Get new token for updated client
            const clientRes = await request(ctx.app.getHttpServer())
                .get("/client/restricted-client/secret")
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            const newTokenRes = await request(ctx.app.getHttpServer())
                .post("/oauth2/token")
                .send({
                    client_id: "restricted-client",
                    client_secret: clientRes.body.secret,
                    grant_type: "client_credentials",
                })
                .expect(201);

            const newToken = newTokenRes.body.access_token;

            // Now the client should be able to use pid presentation config
            const presRes = await request(ctx.app.getHttpServer())
                .post("/verifier/offer")
                .set("Authorization", `Bearer ${newToken}`)
                .send({
                    response_type: ResponseType.URI,
                    requestId: "pid",
                });

            expect(presRes.status).toBe(201);

            // And citizen issuance config
            const issRes = await request(ctx.app.getHttpServer())
                .post("/issuer/offer")
                .set("Authorization", `Bearer ${newToken}`)
                .send({
                    response_type: ResponseType.URI,
                    credentialConfigurationIds: ["citizen"],
                    flow: "pre_authorized_code",
                });

            expect(issRes.status).toBe(201);
        });

        test("empty allowed configs array means all configs are allowed", async () => {
            // Create client with empty arrays
            await request(ctx.app.getHttpServer())
                .post("/client")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    clientId: "empty-arrays-client",
                    roles: [Role.PresentationOffer, Role.IssuanceOffer],
                    allowedPresentationConfigs: [], // Empty = all allowed
                    allowedIssuanceConfigs: [], // Empty = all allowed
                })
                .expect(201);

            const clientRes = await request(ctx.app.getHttpServer())
                .get("/client/empty-arrays-client/secret")
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            const tokenRes = await request(ctx.app.getHttpServer())
                .post("/oauth2/token")
                .send({
                    client_id: "empty-arrays-client",
                    client_secret: clientRes.body.secret,
                    grant_type: "client_credentials",
                })
                .expect(201);

            const token = tokenRes.body.access_token;

            // Should be able to use any presentation config
            const presRes = await request(ctx.app.getHttpServer())
                .post("/verifier/offer")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    response_type: ResponseType.URI,
                    requestId: "pid",
                });

            expect(presRes.status).toBe(201);
        });
    });
});
