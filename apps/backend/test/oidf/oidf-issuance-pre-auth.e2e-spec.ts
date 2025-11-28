import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test, TestingModule } from "@nestjs/testing";
import * as axios from "axios";
import { readFileSync } from "fs";
import https from "https";
import { join, resolve } from "path";
import { beforeAll, describe, expect, test } from "vitest";
import { AppModule } from "../../src/app.module";
import { OIDFSuite } from "./oidf-suite";

/**
 * E2E: OIDF conformance runner integration test
 */
describe("OIDF - issuance - pre auth", () => {
    const PUBLIC_DOMAIN = import.meta.env.VITE_DOMAIN;
    const OIDF_URL =
        import.meta.env.VITE_OIDF_URL ??
        "https://demo.certification.openid.net";
    const OIDF_DEMO_TOKEN = import.meta.env.VITE_OIDF_DEMO_TOKEN;

    if (!PUBLIC_DOMAIN) {
        throw new Error("VITE_DOMAIN must be set");
    }

    let app: INestApplication;
    let PLAN_ID: string;
    let authToken: string;

    const axiosBackendInstance = axios.default.create({
        baseURL: "https://localhost:3000",
        httpsAgent: new https.Agent({
            rejectUnauthorized: false,
        }),
    });

    const oidfSuite = new OIDFSuite(OIDF_URL, OIDF_DEMO_TOKEN);

    beforeAll(async () => {
        const planId = "oid4vci-1_0-issuer-test-plan";
        const variant = {
            client_auth_type: "client_attestation",
            sender_constrain: "dpop",
            vci_authorization_code_flow_variant: "issuer_initiated",
            authorization_request_type: "simple",
            vci_profile: "haip",
            fapi_request_method: "unsigned",
            vci_grant_type: "pre_authorization_code",
        };
        const body = {
            description:
                "VCI tests of wallet initiated flow with client attestation",
            server: {
                discoveryIssuer: `https://${PUBLIC_DOMAIN}`,
            },
            client: {
                jwks: {
                    keys: [
                        {
                            kty: "EC",
                            d: "y2NSNIvlRAEBMFk2bjQcSKbjS1y_NBJQ6jRzIfuIxS0",
                            use: "sig",
                            x5c: [
                                "MIIIVTCCB/ugAwIBAgIUGflIlFytY5rT5iB6DdH2oYI/9/swCgYIKoZIzj0EAwIwITELMAkGA1UEBhMCR0IxEjAQBgNVBAMMCU9JREYgVGVzdDAeFw0yNDExMjcyMDQwNDhaFw0zNDExMjUyMDQwNDhaMCExCzAJBgNVBAYTAkdCMRIwEAYDVQQDDAlPSURGIFRlc3QwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAATT/dLsd51LLBrGV6R23o6vymRxHXeFBoI8yq31y5kFV2VV0gi9x5ZzEFiq8DMiAHucLACFndxLtZorCha9zznQo4IHDzCCBwswHQYDVR0OBBYEFLlxt2AB4wGLnDGlunAhIaFKEBYRMB8GA1UdIwQYMBaAFLlxt2AB4wGLnDGlunAhIaFKEBYRMA8GA1UdEwEB/wQFMAMBAf8wgga2BgNVHREEggatMIIGqYIQd3d3LmhlZW5hbi5tZS51a4IJbG9jYWxob3N0ghZsb2NhbGhvc3QuZW1vYml4LmNvLnVrgh1kZW1vLmNlcnRpZmljYXRpb24ub3BlbmlkLm5ldIIcd3d3LmNlcnRpZmljYXRpb24ub3BlbmlkLm5ldIIgc3RhZ2luZy5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCImRlbW8ucGlkLWlzc3Vlci5idW5kZXNkcnVja2VyZWkuZGWCMHJldmlldy1hcHAtZGV2LWJyYW5jaC0xLmNlcnRpZmljYXRpb24ub3BlbmlkLm5ldIIwcmV2aWV3LWFwcC1kZXYtYnJhbmNoLTIuY2VydGlmaWNhdGlvbi5vcGVuaWQubmV0gjByZXZpZXctYXBwLWRldi1icmFuY2gtMy5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMHJldmlldy1hcHAtZGV2LWJyYW5jaC00LmNlcnRpZmljYXRpb24ub3BlbmlkLm5ldIIwcmV2aWV3LWFwcC1kZXYtYnJhbmNoLTUuY2VydGlmaWNhdGlvbi5vcGVuaWQubmV0gjByZXZpZXctYXBwLWRldi1icmFuY2gtNi5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMHJldmlldy1hcHAtZGV2LWJyYW5jaC03LmNlcnRpZmljYXRpb24ub3BlbmlkLm5ldIIwcmV2aWV3LWFwcC1kZXYtYnJhbmNoLTguY2VydGlmaWNhdGlvbi5vcGVuaWQubmV0gjByZXZpZXctYXBwLWRldi1icmFuY2gtOS5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0xMC5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0xMS5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0xMi5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0xMy5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0xNC5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0xNS5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0xNi5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0xNy5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0xOC5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0xOS5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0yMC5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0yMS5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0yMi5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0yMy5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0yNC5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0yNS5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0yNi5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0yNy5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0yOC5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0yOS5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXSCMXJldmlldy1hcHAtZGV2LWJyYW5jaC0zMC5jZXJ0aWZpY2F0aW9uLm9wZW5pZC5uZXQwCgYIKoZIzj0EAwIDSAAwRQIgDhkzF+KXVuao5Z9lU2qMScmkgrPQ5MBtUPVdqtTtZpwCIQDMUl5ofjp1/4mNXz+gpSz5oqmhW9hS4IhRhAs/AlR40w==",
                            ],
                            crv: "P-256",
                            kid: "5H1WLeSx55tMW6JNlvqMfg3O_E0eQPqB8jDSoUn6oiI",
                            x: "0_3S7HedSywaxlekdt6Or8pkcR13hQaCPMqt9cuZBVc",
                            y: "ZVXSCL3HlnMQWKrwMyIAe5wsAIWd3Eu1misKFr3POdA",
                            alg: "ES256",
                        },
                        {
                            kty: "EC",
                            d: "7N8jd8HvUp3vHC7a-xitehRnYuyZLy3kqkxG7KmpfMY",
                            use: "enc",
                            crv: "P-256",
                            kid: "A541J5yUqazgE8WBFkIyeh2OtK-udqUR_OC0kB7l3oU",
                            x: "cwYyuS94hcOtcPlrMMtGtflCfbZUwz5Mf1Gfa2m0AM8",
                            y: "KB7sJkFQyB8jZHO9vmWS5LNECL4id3OJO9HX9ChNonA",
                            alg: "ECDH-ES",
                        },
                    ],
                },
                dcql: {
                    credentials: [
                        {
                            id: "mdl",
                            format: "mso_mdoc",
                            meta: {
                                doctype_value: "org.iso.18013.5.1.mDL",
                            },
                            claims: [
                                {
                                    path: ["org.iso.18013.5.1", "family_name"],
                                },
                                {
                                    path: ["org.iso.18013.5.1", "given_name"],
                                },
                            ],
                        },
                    ],
                },
                client_id: "localhost",
                authorization_encrypted_response_enc: "A128GCM",
                scope: "eu.europa.ec.eudi.pid.1",
            },
            alias: "acme-vci-test-3",
            vci: {
                credential_issuer_url: `https://${PUBLIC_DOMAIN}/root`,
                credential_configuration_id: "pid",
                client_attester_keys_jwks: {
                    keys: [
                        {
                            kty: "EC",
                            d: "wPgS-JBxGPdUjrvQNYqjuPC3CnlF-QA2t5AHQtYUjG4",
                            use: "sig",
                            crv: "P-256",
                            kid: "key1",
                            x: "r3AhAtAaGBZOAn7QwsIKi_YKrA3IvIrVRGps9gVgz00",
                            y: "HxAv6cxZ7-N-oD8Q3niWHQqpVMwQrFm0STV58tIdbHg",
                            alg: "ES256",
                            x5c: [
                                "MIIBDjCBtqADAgECAgYBl6aBZxIwCgYIKoZIzj0EAwIwDzENMAsGA1UEAwwEa2V5MTAeFw0yNTA2MjUwOTUzMDdaFw0yNjA0MjEwOTUzMDdaMA8xDTALBgNVBAMMBGtleTEwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAASvcCEC0BoYFk4CftDCwgqL9gqsDci8itVEamz2BWDPTR8QL+nMWe/jfqA/EN54lh0KqVTMEKxZtEk1efLSHWx4MAoGCCqGSM49BAMCA0cAMEQCIE9XH1rkfpFRNGBKPX3mfZq0HiC+23dUF0JddUbOnIAPAiBOefYpruKIDGh8hxky3pQ3AKBVezaCu55s4njOSgJYrA==",
                            ],
                        },
                    ],
                },
                client_attestation_issuer:
                    "https://client-attester.example.org/",
                static_tx_code: "1234",
            },
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
        configService.set("PUBLIC_URL", `https://${PUBLIC_DOMAIN}`);
        configService.set("CONFIG_FOLDER", configFolder);
        configService.set("CONFIG_IMPORT", true);
        configService.set("CONFIG_IMPORT_FORCE", true);

        await app.init();
        await app.listen(3000, "0.0.0.0");

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

        console.log(`${OIDF_URL}/plan-detail.html?plan=${PLAN_ID}`);
        // Create test instance
        // running this will cause to run the first test but also returns no result. Test will time out.
        /* testInstance = await oidfSuite.getInstance(PLAN_ID).catch((err) => {
            console.error("Error getting test instance:", err);
            throw err;
        }); */
    });

    afterAll(async () => {
        const outputDir = resolve(__dirname, `../../logs/${PLAN_ID}`);
        await oidfSuite.storeLog(PLAN_ID, outputDir);
        console.log(`Test log extracted to: ${outputDir}`);

        if (app) {
            await app.close();
        }
    });

    test("oid4vci-1_0-issuer-metadata-test", async () => {
        const testInstance = await oidfSuite.startTest(
            PLAN_ID,
            "oid4vci-1_0-issuer-metadata-test",
        );

        console.log(
            `Test details: ${OIDF_URL}/log-detail.html?log=${testInstance.id}`,
        );

        const logResult = await oidfSuite.waitForFinished(testInstance.id);
        expect(logResult.result).toBe("PASSED");
    });

    test("oid4vci-1_0-issuer-happy-flow", async () => {
        const testInstance = await oidfSuite.startTest(
            PLAN_ID,
            "oid4vci-1_0-issuer-happy-flow",
        );

        console.log(
            `Test details: ${OIDF_URL}/log-detail.html?log=${testInstance.id}`,
        );

        // Request an issuance offer from the local backend
        const offerResponse = await axiosBackendInstance.post<{ uri: string }>(
            `/issuer-management/offer`,
            {
                response_type: "uri",
                credentialConfigurationIds: ["pid"],
                flow: "pre_authorized_code",
            },
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            },
        );

        expect(offerResponse.data.uri).toBeDefined();

        // Extract parameters from the URI
        const uriParts = offerResponse.data.uri.split("//");
        if (uriParts.length < 2) {
            throw new Error(`Invalid URI format: ${offerResponse.data.uri}`);
        }
        const parameters = uriParts[1];

        // Get the credential offer endpoint from the test runner
        const url = await oidfSuite.getEndpoint(testInstance);

        // Send the offer to the OIDF test runner
        await axios.default.get(`${url}${parameters}`, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
        });

        const logResult = await oidfSuite.waitForFinished(testInstance.id);
        expect(logResult.result).toBe("PASSED");
    }, 10000);

    test("oid4vci-1_0-issuer-ensure-request-object-with-multiple-aud-succeeds", async () => {
        const testInstance = await oidfSuite.startTest(
            PLAN_ID,
            "oid4vci-1_0-issuer-ensure-request-object-with-multiple-aud-succeeds",
        );

        console.log(
            `Test details: ${OIDF_URL}/log-detail.html?log=${testInstance.id}`,
        );

        // Request an issuance offer from the local backend
        const offerResponse = await axiosBackendInstance.post<{ uri: string }>(
            `/issuer-management/offer`,
            {
                response_type: "uri",
                credentialConfigurationIds: ["pid"],
                flow: "pre_authorized_code",
            },
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            },
        );

        expect(offerResponse.data.uri).toBeDefined();

        // Extract parameters from the URI
        const uriParts = offerResponse.data.uri.split("//");
        if (uriParts.length < 2) {
            throw new Error(`Invalid URI format: ${offerResponse.data.uri}`);
        }
        const parameters = uriParts[1];

        // Get the credential offer endpoint from the test runner
        const url = await oidfSuite.getEndpoint(testInstance);

        // Send the offer to the OIDF test runner
        await axios.default.get(`${url}${parameters}`, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
        });

        const logResult = await oidfSuite.waitForFinished(testInstance.id);
        expect(logResult.result).toBe("PASSED");
    });
});
