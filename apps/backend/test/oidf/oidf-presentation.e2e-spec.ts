import { readFileSync } from "node:fs";
import https from "node:https";
import { join, resolve } from "node:path";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test, TestingModule } from "@nestjs/testing";
import * as axios from "axios";
import { Logger } from "nestjs-pino";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AppModule } from "../../src/app.module";
import { CertImportDto } from "../../src/crypto/key/dto/cert-import.dto";
import { KeyImportDto } from "../../src/crypto/key/dto/key-import.dto";
import { getDefaultSecret, readConfig } from "../utils";
import { useOidfContainers } from "./oidf-setup";
import { OIDFSuite, TestInstance } from "./oidf-suite";

// Setup OIDF containers for this test file
useOidfContainers();

/**
 * E2E: OIDF conformance runner integration test
 */
describe("OIDF", () => {
    const PUBLIC_DOMAIN =
        import.meta.env.VITE_DOMAIN ?? "host.testcontainers.internal:3000";
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
        //use existing keys from the config folder
        const key = readConfig<KeyImportDto>(
            resolve(
                __dirname + "/../../../../assets/config/root/keys/sign.json",
            ),
        );

        const issuerCert = readConfig<CertImportDto>(
            resolve(
                __dirname + "/../../../../assets/config/root/certs/cert.json",
            ),
        ).crt!;

        const planId = "oid4vp-1final-verifier-test-plan";
        const variant = {
            credential_format: "sd_jwt_vc",
            client_id_prefix: "x509_hash",
            request_method: "request_uri_signed",
            response_mode: "direct_post.jwt",
        };
        const body = {
            alias: "test-plan",
            description: "test plan created via e2e tests",
            credential: {
                signing_jwk: {
                    ...key.key,
                    use: "sig",
                    x5c: issuerCert.map((cert) =>
                        cert
                            .replaceAll("-----BEGIN CERTIFICATE-----", "")
                            .replaceAll("-----END CERTIFICATE-----", "")
                            .replaceAll(/\r?\n|\r/g, ""),
                    ),
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
            key: readFileSync(resolve(__dirname, "../key.pem")),
            cert: readFileSync(resolve(__dirname, "../cert.pem")),
        };

        app = moduleFixture.createNestApplication<NestExpressApplication>({
            httpsOptions,
        });

        // Use Pino logger for all NestJS logging (same as main.ts)
        app.useLogger(app.get(Logger));
        app.useGlobalPipes(new ValidationPipe());

        const configService = app.get(ConfigService);
        const configFolder = resolve(__dirname + "/../../../../assets/config");
        const tmpFolder = resolve(__dirname, "../../../../tmp");
        configService.set("FOLDER", tmpFolder);
        configService.set("CONFIG_FOLDER", configFolder);
        configService.set("PUBLIC_URL", `https://${PUBLIC_DOMAIN}`);
        configService.set("CONFIG_IMPORT", true);
        configService.set("CONFIG_IMPORT_FORCE", true);
        configService.set("LOG_LEVEL", "debug");

        await app.init();
        await app.listen(3000, "0.0.0.0");

        // Get client credentials
        const client = JSON.parse(
            readFileSync(join(configFolder, "root/clients/test.json"), "utf-8"),
        );
        const clientId = client.clientId;
        const clientSecret = getDefaultSecret(client.secret);

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

        console.log(
            `Test details: ${OIDF_URL}/log-detail.html?log=${testInstance.id}`,
        );
    });

    afterAll(async () => {
        const outputDir = resolve(
            __dirname,
            `../../../../tmp/oidf-logs/${PLAN_ID}`,
        );
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
            `/verifier/offer`,
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
