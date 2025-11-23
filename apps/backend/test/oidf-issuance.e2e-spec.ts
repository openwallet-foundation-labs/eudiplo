import * as axios from "axios";
import { test } from "vitest";

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

    // Demo OIDF server configuration — read from env when available.
    const OIDF_URL =
        process.env.VITE_OIDF_URL ?? "https://demo.certification.openid.net";
    const OIDF_DEMO_TOKEN = process.env.VITE_OIDF_DEMO_TOKEN;
    const PRE_AUTH_PLAN_ID = "DW5WarWxHpR33";
    const AUTH_CODE_PLAN_ID = "YQh1KysTUByvl";

    // --- Test-run state (populated at runtime) ----------------------------------
    let authToken: string;
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
    });

    async function startTest(plan, test) {
        // Create a runner (testInstance) on the demo server using the first module
        const testInstance = await instance
            .post("/api/runner", undefined, {
                params: {
                    test,
                    plan: plan,
                },
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            })
            .then((res) => res.data);

        console.log(
            `https://demo.certification.openid.net/log-detail.html?log=${testInstance.id}`,
        );
        return testInstance;
    }

    test("oid4vci-1_0-issuer-metadata-test", async () => {
        const testInstance = await startTest(
            PRE_AUTH_PLAN_ID,
            "oid4vci-1_0-issuer-metadata-test",
        );

        let logResult: any;
        while (!logResult || logResult.status !== "FINISHED") {
            // Finally, fetch the runner status and assert the test passed.
            await instance
                .get(`/api/info/${testInstance.id}`)
                .then((res) => (logResult = res.data));
            await sleep(300);
        }
        expect(logResult.result).toBe("PASSED");
    });

    test("oid4vci-1_0-issuer-happy-flow", async () => {
        const testInstance = await startTest(
            PRE_AUTH_PLAN_ID,
            "oid4vci-1_0-issuer-happy-flow",
        );

        // Request a presentation URI from the local backend
        const res = await axios.default
            .post(
                "http://localhost:3000/issuer-management/offer",
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
            )
            .then((response) => response.data);

        // The backend returns a URI that includes parameters after the scheme.
        const parameters = res.uri.split("//")[1];

        await instance
            .get(`/api/runner/${testInstance.id}`)
            .then((res) => res.data);

        const url = await getEndpoint(testInstance);
        // Follow the authorize URL exposed by the runner to simulate the user's action.
        await axios.default.get(`${url}` + parameters);

        let logResult: any;
        while (!logResult || logResult.status !== "FINISHED") {
            // Finally, fetch the runner status and assert the test passed.
            await instance
                .get(`/api/info/${testInstance.id}`)
                .then((res) => (logResult = res.data));
            await sleep(300);
        }
        expect(logResult.result).toBe("PASSED");
    }, 10000);

    test("auth flow", async () => {
        const testInstance = await startTest(
            AUTH_CODE_PLAN_ID,
            "oid4vci-1_0-issuer-happy-flow",
        );

        // Request a presentation URI from the local backend
        const res = await axios.default
            .post(
                "http://localhost:3000/issuer-management/offer",
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
            )
            .then((response) => response.data);

        // The backend returns a URI that includes parameters after the scheme.
        const parameters = res.uri.split("//")[1];

        await instance
            .get(`/api/runner/${testInstance.id}`)
            .then((res) => res.data);

        const url = await getEndpoint(testInstance);
        // Follow the authorize URL exposed by the runner to simulate the user's action.
        await axios.default.get(`${url}` + parameters);

        let logResult: any;
        while (!logResult || logResult.status !== "FINISHED") {
            // Finally, fetch the runner status and assert the test passed.
            await instance
                .get(`/api/info/${testInstance.id}`)
                .then((res) => (logResult = res.data));
            await sleep(300);
        }
        expect(logResult.result).toBe("PASSED");
    }, 10000);

    test("oid4vci-1_0-issuer-ensure-request-object-with-multiple-aud-succeeds", async () => {
        const testInstance = await startTest(
            PRE_AUTH_PLAN_ID,
            "oid4vci-1_0-issuer-ensure-request-object-with-multiple-aud-succeeds",
        );

        // Request a presentation URI from the local backend
        const res = await axios.default
            .post(
                "http://localhost:3000/issuer-management/offer",
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
            )
            .then((response) => response.data);

        // The backend returns a URI that includes parameters after the scheme.
        const parameters = res.uri.split("//")[1];

        await instance
            .get(`/api/runner/${testInstance.id}`)
            .then((res) => res.data);

        const url = await getEndpoint(testInstance);
        // Follow the authorize URL exposed by the runner to simulate the user's action.
        await axios.default.get(`${url}` + parameters);

        let logResult: any;
        while (!logResult || logResult.status !== "FINISHED") {
            // Finally, fetch the runner status and assert the test passed.
            await instance
                .get(`/api/info/${testInstance.id}`)
                .then((res) => (logResult = res.data));
            await sleep(300);
        }
        expect(logResult.result).toBe("PASSED");
    }, 10000);

    async function getEndpoint(testInstance): Promise<string> {
        let url;
        while (!url) {
            url = await instance
                .get(`/api/runner/${testInstance.id}`)
                .then((res) => res.data.exposed.credential_offer_endpoint);
            await sleep(300);
        }
        return url;
    }
});
