import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test, TestingModule } from "@nestjs/testing";
import * as axios from "axios";
import { readFileSync } from "fs";
import https from "https";
import { join, resolve } from "path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AppModule } from "../../src/app.module";
import { OIDFSuite, TestInstance } from "./oidf-suite";

/**
 * E2E: OIDF conformance runner integration test
 */
describe("OIDF", () => {
    const PUBLIC_DOMAIN =
        import.meta.env.VITE_DOMAIN ?? "host.docker.internal:3000";
    const OIDF_URL = import.meta.env.VITE_OIDF_URL ?? "https://localhost:8443";
    const OIDF_DEMO_TOKEN = import.meta.env.VITE_OIDF_DEMO_TOKEN;

    let app: INestApplication;
    let PLAN_ID: string;
    let authToken: string;
    let testInstance: TestInstance;

    const axiosBackendInstance = axios.default.create({
        baseURL: "https://localhost:3000",
        httpsAgent: new https.Agent({
            rejectUnauthorized: false,
        }),
    });

    const oidfSuite = new OIDFSuite(OIDF_URL, OIDF_DEMO_TOKEN);

    beforeAll(async () => {
        const planId = "oid4vp-1final-verifier-test-plan";
        const variant = {
            credential_format: "sd_jwt_vc",
            client_id_prefix: "x509_san_dns",
            request_method: "request_uri_signed",
            response_mode: "direct_post.jwt",
        };
        const body = {
            alias: "test-plan",
            description: "test plan created via e2e tests",
            client: {
                client_id: new URL(`https://${PUBLIC_DOMAIN}`).hostname,
            },
            credential: {
                signing_jwk: {
                    kty: "EC",
                    d: "y2NSNIvlRAEBMFk2bjQcSKbjS1y_NBJQ6jRzIfuIxS0",
                    use: "sig",
                    x5c: [
                        "MIICHjCCAcOgAwIBAgIUZX9BS5CDOJRW2t1FK1UDMt/QwMEwCgYIKoZIzj0EAwIwITELMAkGA1UEBhMCR0IxEjAQBgNVBAMMCU9JREYgVGVzdDAeFw0yNDExMjUwODM2MDRaFw0zNDExMjMwODM2MDRaMCExCzAJBgNVBAYTAkdCMRIwEAYDVQQDDAlPSURGIFRlc3QwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAATT/dLsd51LLBrGV6R23o6vymRxHXeFBoI8yq31y5kFV2VV0gi9x5ZzEFiq8DMiAHucLACFndxLtZorCha9zznQo4HYMIHVMB0GA1UdDgQWBBS5cbdgAeMBi5wxpbpwISGhShAWETAfBgNVHSMEGDAWgBS5cbdgAeMBi5wxpbpwISGhShAWETAPBgNVHRMBAf8EBTADAQH/MIGBBgNVHREEejB4ghB3d3cuaGVlbmFuLm1lLnVrgh1kZW1vLmNlcnRpZmljYXRpb24ub3BlbmlkLm5ldIIJbG9jYWxob3N0ghZsb2NhbGhvc3QuZW1vYml4LmNvLnVrgiJkZW1vLnBpZC1pc3N1ZXIuYnVuZGVzZHJ1Y2tlcmVpLmRlMAoGCCqGSM49BAMCA0kAMEYCIQCPbnLxCI+WR1vhOW+A8KznAWv1MJo+YEb1MI45NKW/VQIhALzsqox8VuBRwN2dl5LkpnxP4oH9p6H0AOZmKP+Y7nXS",
                    ],
                    crv: "P-256",
                    kid: "5H1WLeSx55tMW6JNlvqMfg3O_E0eQPqB8jDSoUn6oiI",
                    x: "0_3S7HedSywaxlekdt6Or8pkcR13hQaCPMqt9cuZBVc",
                    y: "ZVXSCL3HlnMQWKrwMyIAe5wsAIWd3Eu1misKFr3POdA",
                    alg: "ES256",
                },
            },
            publish: "everything",
        };

        PLAN_ID = await oidfSuite.createPlan(planId, variant, body);

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        // Enable HTTPS with self-signed certificate
        const httpsOptions = {
            key: readFileSync(resolve(__dirname, "../../key.pem")),
            cert: readFileSync(resolve(__dirname, "../../cert.pem")),
        };

        app = moduleFixture.createNestApplication<NestExpressApplication>({
            httpsOptions,
        });
        app.useGlobalPipes(new ValidationPipe());

        const configService = app.get(ConfigService);
        const configFolder = resolve(__dirname + "/../../../../assets/config");
        configService.set("CONFIG_FOLDER", configFolder);
        configService.set("PUBLIC_URL", `https://${PUBLIC_DOMAIN}`);
        configService.set("CONFIG_IMPORT", true);
        configService.set("CONFIG_IMPORT_FORCE", true);

        await app.init();
        await app.listen(3000);

        console.log("Backend application started for OIDF E2E tests");

        // Get client credentials
        const client = JSON.parse(
            readFileSync(join(configFolder, "root/clients/test.json"), "utf-8"),
        );
        const clientId = client.clientId;
        const clientSecret = client.secret;

        // Acquire JWT token using client credentials
        const tokenResponse = await axiosBackendInstance.post<{
            access_token: string;
        }>("/oauth2/token", {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "client_credentials",
        });

        authToken = tokenResponse.data.access_token;
        expect(authToken).toBeDefined();

        // Create test instance
        testInstance = await oidfSuite.getInstance(PLAN_ID);
    });

    afterAll(async () => {
        const outputDir = resolve(__dirname, `../../logs/${PLAN_ID}`);
        await oidfSuite.storeLog(PLAN_ID, outputDir);

        if (app) {
            await app.close();
        }
    });

    test("oidf conformance suite presentation", async () => {
        // Request presentation URI from backend
        const presentationResponse = await axiosBackendInstance.post<{
            uri: string;
            session: string;
        }>(
            `/presentation-management/request`,
            {
                response_type: "uri",
                requestId: "pid-no-hook",
            },
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            },
        );

        expect(presentationResponse.data.uri).toBeDefined();

        // Extract query parameters from URI (format: openid4vp://...?params)
        const uri = presentationResponse.data.uri;
        const queryStart = uri.indexOf("?");
        if (queryStart === -1) {
            throw new Error(`URI missing query parameters: ${uri}`);
        }
        const queryString = uri.substring(queryStart);

        // Simulate wallet authorization via OIDF runner
        const authorizeUrl = `${testInstance.url}/authorize${queryString}`;
        await axios.default.get(authorizeUrl, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
        });

        // Wait for test completion (2s polling delay)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const result = await oidfSuite.getResult(testInstance.id);
        expect(result).toBe("PASSED");
    }, 10000);
});
