import * as axios from "axios";
import { beforeAll, describe, expect, test } from "vitest";
import { OIDFSuite, TestInstance } from "./oidf-suite";

/**
 * E2E: OIDF conformance runner integration test
 */
describe("OIDF", () => {
    const CLIENT_ID = process.env.VITE_OIDF_CLIENT_ID;
    const CLIENT_SECRET = process.env.VITE_OIDF_CLIENT_SECRET;
    const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

    // Demo OIDF server configuration — read from env when available.
    const OIDF_URL =
        process.env.VITE_OIDF_URL ?? "https://demo.certification.openid.net";
    const OIDF_DEMO_TOKEN = process.env.VITE_OIDF_DEMO_TOKEN!;
    const PLAN_ID = "FkyShJcFlHDbc";

    // --- Test-run state (populated at runtime) ----------------------------------
    let authToken: string;
    let testInstance: TestInstance;
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

        // Create test instance and wait for it to be ready
        testInstance = await oidfSuite.getInstance(PLAN_ID);

        console.log(
            `Test details: ${OIDF_URL}/log-detail.html?log=${testInstance.id}`,
        );
    }, 30000);

    test("oidf conformance suite presentation", async () => {
        // Step 1: Request a presentation URI from the local backend
        const presentationResponse = await axios.default.post<{
            uri: string;
            session: string;
        }>(
            `${BACKEND_URL}/presentation-management/request`,
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

        // Step 2: Extract parameters from the URI
        // The backend returns a URI like "openid4vp://param1=value1&param2=value2"
        const uriParts = presentationResponse.data.uri.split("//");
        if (uriParts.length < 2) {
            throw new Error(
                `Invalid URI format: ${presentationResponse.data.uri}`,
            );
        }
        const parameters = uriParts[1];

        // Step 3: Simulate wallet authorization by calling the OIDF runner's authorize endpoint
        const authorizeUrl = `${testInstance.url}/authorize${parameters}`;
        await axios.default.get(authorizeUrl);

        // Step 4: Poll for test completion and verify result
        // Give the test some time to complete
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const result = await oidfSuite.getResult(testInstance.id);

        expect(result).toBe("PASSED");
    }, 30000);
});
