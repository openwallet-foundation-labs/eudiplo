import * as axios from "axios";
import { beforeAll, describe, expect, test } from "vitest";
import { OIDFSuite } from "./oidf-suite";

/**
 * E2E: OIDF conformance runner integration test
 *
 * This test suite performs the following steps:
 * - Retrieves a local access token from the backend using client credentials
 * - Interacts with the OpenID Foundation demo server to fetch a test plan
 * - Creates a runner instance on the demo server and polls until it's in WAITING state
 * - Requests a issuance config from the local backend and follows the authorize URL exposed by the runner
 * - Asserts that the test runner reports a PASSED result
 *
 * Notes / assumptions:
 * - Local backend must be reachable at http://localhost:3000
 * - Demo OIDF server must be reachable at https://demo.certification.openid.net
 */
describe("OIDF - issuance", () => {
    // --- Configuration / constants -------------------------------------------------
    // Client credentials used to get an access token from the local backend.
    // These can be provided via a .env file at the repository root. Example keys:
    // OIDF_CLIENT_ID, OIDF_CLIENT_SECRET, OIDF_PLAN_ID, OIDF_DEMO_TOKEN, OIDF_URL
    const CLIENT_ID = process.env.VITE_OIDF_CLIENT_ID;
    const CLIENT_SECRET = process.env.VITE_OIDF_CLIENT_SECRET;
    const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

    // Demo OIDF server configuration — read from env when available.
    const OIDF_URL =
        process.env.VITE_OIDF_URL ?? "https://demo.certification.openid.net";
    const OIDF_DEMO_TOKEN = process.env.VITE_OIDF_DEMO_TOKEN!;
    const PRE_AUTH_PLAN_ID = "DW5WarWxHpR33";
    const AUTH_CODE_PLAN_ID = "YQh1KysTUByvl";

    // --- Test-run state (populated at runtime) ----------------------------------
    let authToken: string;
    const oidfSuite = new OIDFSuite(OIDF_URL, OIDF_DEMO_TOKEN);

    /**
     * Prepare the external runner and local authorization token.
     * - Acquires a token from the local backend
     * - Fetches the plan from the demo server
     * - Creates a runner (testInstance) and polls until it reaches WAITING state
     */
    beforeAll(async () => {
        if (!CLIENT_ID || !CLIENT_SECRET) {
            throw new Error(
                "VITE_OIDF_CLIENT_ID and VITE_OIDF_CLIENT_SECRET must be set",
            );
        }
        if (!OIDF_DEMO_TOKEN) {
            throw new Error("VITE_OIDF_DEMO_TOKEN must be set");
        }

        // --- Acquire local backend token -----------------------------------------
        // Get JWT token using client credentials
        const tokenResponse = await axios.default.post<{
            access_token: string;
        }>(`${BACKEND_URL}/oauth2/token`, {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: "client_credentials",
        });

        authToken = tokenResponse.data.access_token;
        expect(authToken).toBeDefined();
        expect(authToken).toBeTruthy();
    });

    test("oid4vci-1_0-issuer-metadata-test", async () => {
        const testInstance = await oidfSuite.startTest(
            PRE_AUTH_PLAN_ID,
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
            PRE_AUTH_PLAN_ID,
            "oid4vci-1_0-issuer-happy-flow",
        );

        console.log(
            `Test details: ${OIDF_URL}/log-detail.html?log=${testInstance.id}`,
        );

        // Request an issuance offer from the local backend
        const offerResponse = await axios.default.post<{ uri: string }>(
            `${BACKEND_URL}/issuer-management/offer`,
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
        await axios.default.get(`${url}${parameters}`);

        const logResult = await oidfSuite.waitForFinished(testInstance.id);
        expect(logResult.result).toBe("PASSED");
    }, 10000);

    test("auth flow", async () => {
        const testInstance = await oidfSuite.startTest(
            AUTH_CODE_PLAN_ID,
            "oid4vci-1_0-issuer-happy-flow",
        );

        console.log(
            `Test details: ${OIDF_URL}/log-detail.html?log=${testInstance.id}`,
        );

        // Request an issuance offer from the local backend
        const offerResponse = await axios.default.post<{ uri: string }>(
            `${BACKEND_URL}/issuer-management/offer`,
            {
                response_type: "uri",
                credentialConfigurationIds: ["pid"],
                flow: "authorization_code",
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
        await axios.default.get(`${url}${parameters}`);

        const logResult = await oidfSuite.waitForFinished(testInstance.id);
        expect(logResult.result).toBe("PASSED");
    }, 10000);

    test("oid4vci-1_0-issuer-ensure-request-object-with-multiple-aud-succeeds", async () => {
        const testInstance = await oidfSuite.startTest(
            PRE_AUTH_PLAN_ID,
            "oid4vci-1_0-issuer-ensure-request-object-with-multiple-aud-succeeds",
        );

        console.log(
            `Test details: ${OIDF_URL}/log-detail.html?log=${testInstance.id}`,
        );

        // Request an issuance offer from the local backend
        const offerResponse = await axios.default.post<{ uri: string }>(
            `${BACKEND_URL}/issuer-management/offer`,
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
        await axios.default.get(`${url}${parameters}`);

        const logResult = await oidfSuite.waitForFinished(testInstance.id);
        expect(logResult.result).toBe("PASSED");
    }, 10000);
});
