import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { ResponseType } from "../../src/verifier/oid4vp/dto/presentation-request.dto";
import { PresentationTestContext, setupPresentationTestApp } from "../utils";

describe("Presentation - Offer Creation", () => {
    let app: INestApplication<App>;
    let authToken: string;
    let ctx: PresentationTestContext;

    beforeAll(async () => {
        ctx = await setupPresentationTestApp();
        app = ctx.app;
        authToken = ctx.authToken;
    });

    afterAll(async () => {
        await app.close();
    });

    test("create oid4vp offer", async () => {
        const res = await request(app.getHttpServer())
            .post("/verifier/offer")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                response_type: ResponseType.URI,
                requestId: "pid-no-hook",
            });

        expect(res.status).toBe(201);
        expect(res.body).toBeDefined();
        const session = res.body.session;

        // Check if the session exists
        await request(app.getHttpServer())
            .get(`/session/${session}`)
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.id).toBe(session);
            });
    });

    test("ask for an invalid oid4vp offer", async () => {
        await request(app.getHttpServer())
            .post("/verifier/offer")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                response_type: ResponseType.URI,
                requestId: "invalid",
            })
            .expect(409)
            .expect((res) => {
                expect(res.body.message).toContain(
                    "Request ID invalid not found",
                );
            });
    });
});
