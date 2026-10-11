import { join, resolve } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { JwtService } from "../../src/auth/jwt.service.js";
import { Role } from "../../src/auth/roles/role.enum.js";
import { ResponseType } from "../../src/verifier/oid4vp/dto/presentation-request.dto.js";
import { PresentationConfigCreateDto } from "../../src/verifier/presentations/dto/presentation-config-create.dto.js";
import {
    IssuanceTestContext,
    readConfig,
    setupIssuanceTestApp,
} from "../utils.js";

/**
 * A token of the built-in OAuth2 server is accepted only while its client
 * exists in the token's tenant, with the roles and limits the client has now.
 */
describe("Client token revocation (e2e)", () => {
    let ctx: IssuanceTestContext;

    beforeAll(async () => {
        ctx = await setupIssuanceTestApp();
        for (const file of ["pid.json", "pid-no-hook.json"]) {
            await request(ctx.app.getHttpServer())
                .post("/verifier/config")
                .set("Authorization", `Bearer ${ctx.authToken}`)
                .send(
                    readConfig<PresentationConfigCreateDto>(
                        join(
                            resolve(__dirname, "../fixtures"),
                            "haip/presentation",
                            file,
                        ),
                    ),
                )
                .expect(201);
        }
    });

    afterAll(async () => {
        await ctx?.app?.close();
    });

    function tokenResponse(clientId: string, secret: string) {
        return request(ctx.app.getHttpServer())
            .post("/api/oauth2/token")
            .send({
                grant_type: "client_credentials",
                client_id: clientId,
                client_secret: secret,
            })
            .expect(201);
    }

    async function accessToken(clientId: string, secret: string) {
        return (await tokenResponse(clientId, secret)).body
            .access_token as string;
    }

    async function createClient(
        adminToken: string,
        body: Record<string, unknown>,
    ): Promise<string> {
        const response = await request(ctx.app.getHttpServer())
            .post("/client")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(body)
            .expect(201);
        return response.body.clientSecret as string;
    }

    function deleteClient(clientId: string) {
        return request(ctx.app.getHttpServer())
            .delete(`/client/${clientId}`)
            .set("Authorization", `Bearer ${ctx.authToken}`)
            .expect(204);
    }

    function issuanceOffer(token: string, configIds: string[]) {
        return request(ctx.app.getHttpServer())
            .post("/issuer/offer")
            .set("Authorization", `Bearer ${token}`)
            .send({
                response_type: ResponseType.URI,
                credentialConfigurationIds: configIds,
                flow: "pre_authorized_code",
            });
    }

    function presentationRequest(token: string, requestId: string) {
        return request(ctx.app.getHttpServer())
            .post("/verifier/offer")
            .set("Authorization", `Bearer ${token}`)
            .send({ response_type: ResponseType.URI, requestId });
    }

    test("the token response has no refresh token", async () => {
        const response = await tokenResponse(ctx.clientId, ctx.clientSecret);

        expect(response.body.access_token).toBeDefined();
        expect(response.body).not.toHaveProperty("refresh_token");
    });

    test("a deleted client's token is rejected, also for configs outside its limits", async () => {
        const clientId = "revoked-restricted";
        const token = await accessToken(
            clientId,
            await createClient(ctx.authToken, {
                clientId,
                roles: [Role.IssuanceOffer, Role.PresentationRequest],
                allowedIssuanceConfigs: ["pid-no-key"],
                allowedPresentationConfigs: ["pid-no-hook"],
            }),
        );
        expect((await issuanceOffer(token, ["pid-no-key"])).status).toBe(201);
        expect((await issuanceOffer(token, ["citizen"])).status).toBe(403);
        expect((await presentationRequest(token, "pid")).status).toBe(403);

        await deleteClient(clientId);

        expect((await issuanceOffer(token, ["pid-no-key"])).status).toBe(401);
        expect((await issuanceOffer(token, ["citizen"])).status).toBe(401);
        expect((await presentationRequest(token, "pid-no-hook")).status).toBe(
            401,
        );
        expect((await presentationRequest(token, "pid")).status).toBe(401);
    });

    test("a refresh token issued before 10.0 is not accepted as a bearer token", async () => {
        const clientId = "legacy-refresh";
        await createClient(ctx.authToken, {
            clientId,
            roles: [Role.IssuanceOffer],
        });
        // 9.x signed both tokens with the same claims and only another expiry.
        const jwt = ctx.app.get(JwtService);
        const issue = (expiresInSeconds: number) =>
            jwt.generateToken(
                { roles: [Role.IssuanceOffer], tenant_id: "root" },
                {
                    expiresInSeconds,
                    audience: "eudiplo-service",
                    subject: clientId,
                },
            );

        const access = await issuanceOffer(await issue(24 * 60 * 60), [
            "pid-no-key",
        ]);
        const refresh = await issuanceOffer(await issue(30 * 24 * 60 * 60), [
            "pid-no-key",
        ]);

        expect(access.status).toBe(201);
        expect(refresh.status).toBe(401);
    });

    test("deleting a tenant ends the access of its clients", async () => {
        const rootToken = await accessToken(ctx.clientId, ctx.clientSecret);
        const tenant = await request(ctx.app.getHttpServer())
            .post("/tenant")
            .set("Authorization", `Bearer ${rootToken}`)
            .send({
                id: "token-revocation-deleted",
                name: "Deleted",
                roles: [Role.IssuanceOffer],
            })
            .expect(201);
        const adminToken = await accessToken(
            tenant.body.client.clientId,
            tenant.body.client.clientSecret,
        );
        const listClients = () =>
            request(ctx.app.getHttpServer())
                .get("/client")
                .set("Authorization", `Bearer ${adminToken}`);
        await listClients().expect(200);

        await request(ctx.app.getHttpServer())
            .delete("/tenant/token-revocation-deleted")
            .set("Authorization", `Bearer ${rootToken}`)
            .expect(204);

        await listClients().expect(401);
    });

    test("a token is rejected once its client ID belongs to another tenant", async () => {
        const clientId = "moved-client";
        const token = await accessToken(
            clientId,
            await createClient(ctx.authToken, {
                clientId,
                roles: [Role.IssuanceOffer],
            }),
        );
        await deleteClient(clientId);

        const tenant = await request(ctx.app.getHttpServer())
            .post("/tenant")
            .set(
                "Authorization",
                `Bearer ${await accessToken(ctx.clientId, ctx.clientSecret)}`,
            )
            .send({
                id: "token-revocation-other",
                name: "Other",
                roles: [Role.IssuanceOffer],
            })
            .expect(201);
        await createClient(
            await accessToken(
                tenant.body.client.clientId,
                tenant.body.client.clientSecret,
            ),
            { clientId, roles: [Role.IssuanceOffer] },
        );

        expect((await issuanceOffer(token, ["pid-no-key"])).status).toBe(401);
    });

    test("role and limit changes apply to tokens already issued", async () => {
        const clientId = "changed-client";
        const token = await accessToken(
            clientId,
            await createClient(ctx.authToken, {
                clientId,
                roles: [Role.IssuanceOffer, Role.PresentationRequest],
            }),
        );
        expect((await issuanceOffer(token, ["citizen"])).status).toBe(201);

        await request(ctx.app.getHttpServer())
            .patch(`/client/${clientId}`)
            .set("Authorization", `Bearer ${ctx.authToken}`)
            .send({
                roles: [Role.PresentationRequest],
                allowedPresentationConfigs: ["pid-no-hook"],
            })
            .expect(200);

        expect((await issuanceOffer(token, ["citizen"])).status).toBe(403);
        expect((await presentationRequest(token, "pid")).status).toBe(403);
        expect((await presentationRequest(token, "pid-no-hook")).status).toBe(
            201,
        );
    });
});
