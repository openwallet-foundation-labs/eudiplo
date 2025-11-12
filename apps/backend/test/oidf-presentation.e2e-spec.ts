import * as axios from "axios";
import { test } from "vitest";

/**
 * E2E: OIDF conformance runner integration test
 *
 * This test suite performs the following steps:
 * - Retrieves a local access token from the backend using client credentials
 * - Interacts with the OpenID Foundation demo server to fetch a test plan
 * - Creates a runner instance on the demo server and polls until it's in WAITING state
 * - Requests a presentation from the local backend and follows the authorize URL exposed by the runner
 * - Asserts that the test runner reports a PASSED result
 *
 * Notes / assumptions:
 * - Local backend must be reachable at http://localhost:3000
 * - Demo OIDF server must be reachable at https://demo.certification.openid.net
 */
describe("OIDF", () => {
    // --- Configuration / constants -------------------------------------------------
    // Client credentials used to get an access token from the local backend.
    // These can be provided via a .env file at the repository root. Example keys:
    // OIDF_CLIENT_ID, OIDF_CLIENT_SECRET, OIDF_PLAN_ID, OIDF_DEMO_TOKEN, OIDF_URL
    const CLIENT_ID = process.env.VITE_OIDF_CLIENT_ID;
    const CLIENT_SECRET = process.env.VITE_OIDF_CLIENT_SECRET;

    // Demo OIDF server configuration — read from env when available.
    const OIDF_URL =
        process.env.VITE_OIDF_URL ?? "https://demo.certification.openid.net";
    const OIDF_DEMO_TOKEN = process.env.VITE_OIDF_DEMO_TOKEN;
    const PLAN_ID = process.env.VITE_OIDF_PLAN_ID;

    // --- Test-run state (populated at runtime) ----------------------------------
    let authToken: string;
    let testInstance: any;
    let instance: axios.AxiosInstance;

    /**
     * Small helper to sleep for a given number of milliseconds.
     * Kept local to the suite to avoid external test helpers.
     */
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    /**
     * Prepare the external runner and local authorization token.
     * - Acquires a token from the local backend
     * - Fetches the plan from the demo server
     * - Creates a runner (testInstance) and polls until it reaches WAITING state
     */
    beforeAll(async () => {
        // --- Acquire local backend token -----------------------------------------
        // Get JWT token using client credentials
        authToken = await axios.default
            .post("http://localhost:3000/oauth2/token", {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: "client_credentials",
            })
            .then((response) => response.data.access_token);
        expect(authToken).toBeDefined();

        // --- Prepare demo OIDF instance ----------------------------------------
        instance = axios.default.create({
            baseURL: OIDF_URL,
            headers: {
                Authorization: `Bearer ${OIDF_DEMO_TOKEN}`,
                "Content-Type": "application/json",
            },
        });

        // Fetch the plan from demo server
        const plan = await instance
            .get(`/api/plan/${PLAN_ID}`)
            .then((res) => res.data);

        // Create a runner (testInstance) on the demo server using the first module
        testInstance = await instance
            .post("/api/runner", undefined, {
                params: {
                    test: plan.modules[0].testModule,
                    plan: plan._id,
                },
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            })
            .then((res) => res.data);

        // Poll until runner is in WAITING state. This is required before we request
        // presentation/authorization flows that the runner will handle.
        let state = "";
        while (state !== "WAITING") {
            await sleep(1000);
            await instance
                .get(`/api/info/${testInstance.id}`)
                .then((res) => (state = res.data.status));
        }

        console.log(
            `https://demo.certification.openid.net/log-detail.html?log=${testInstance.id}`,
        );

        // Small delay to give the runner time to fully initialize.
        await sleep(3000);
    }, 30000);

    test("oidf conformance suite presentation", async () => {
        // Request a presentation URI from the local backend
        const res = await axios.default
            .post(
                "http://localhost:3000/presentation-management/request",
                {
                    response_type: "uri",
                    requestId: "pid",
                },
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                },
            )
            .then((response) => response.data);

        // The backend returns a URI that includes parameters after the scheme.
        const parameters = res.uri.split("//")[1];

        // Follow the authorize URL exposed by the runner to simulate the user's action.
        await axios.default.get(`${testInstance.url}/authorize` + parameters);

        // Finally, fetch the runner status and assert the test passed.
        const testResponse = await instance
            .get(`/api/info/${testInstance.id}`)
            .then((res) => res.data);

        expect(testResponse.result).toBe("PASSED");
    }, 30000);
});
