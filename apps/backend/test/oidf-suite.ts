import * as axios from "axios";

export interface TestInstance {
    id: string;
    url: string;
}

interface TestResult {
    status: string;
    result: string;
}

export class OIDFSuite {
    instance: axios.AxiosInstance;
    constructor(OIDF_URL: string, OIDF_DEMO_TOKEN: string) {
        // --- Prepare demo OIDF instance ----------------------------------------
        this.instance = axios.default.create({
            baseURL: OIDF_URL,
            headers: {
                Authorization: `Bearer ${OIDF_DEMO_TOKEN}`,
                "Content-Type": "application/json",
            },
        });
    }

    async getInstance(PLAN_ID: string): Promise<TestInstance> {
        // Fetch the plan from demo server
        const plan = await this.instance
            .get(`/api/plan/${PLAN_ID}`)
            .then((res) => res.data);

        // Create a runner (testInstance) on the demo server using the first module
        const testInstance: TestInstance = await this.instance
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
        const maxAttempts = 100;
        let attempts = 0;

        while (state !== "WAITING" && attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 300));
            const response = await this.instance.get<TestResult>(
                `/api/info/${testInstance.id}`,
            );
            state = response.data.status;
            attempts++;
        }

        if (state !== "WAITING") {
            throw new Error(
                `Test instance did not reach WAITING state after ${maxAttempts} attempts`,
            );
        }

        return testInstance;
    }

    async getResult(testInstanceId: string): Promise<string> {
        // Fetch the runner status and return the test result
        const response = await this.instance.get<TestResult>(
            `/api/info/${testInstanceId}`,
        );
        return response.data.result;
    }

    async startTest(planId: string, testName: string): Promise<TestInstance> {
        // Create a runner (testInstance) on the demo server using a specific test
        const testInstance: TestInstance = await this.instance
            .post("/api/runner", undefined, {
                params: {
                    test: testName,
                    plan: planId,
                },
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            })
            .then((res) => res.data);

        return testInstance;
    }

    async getEndpoint(testInstance: TestInstance): Promise<string> {
        let url: string | undefined;
        const maxAttempts = 100;
        let attempts = 0;

        while (!url && attempts < maxAttempts) {
            const response = await this.instance.get(
                `/api/runner/${testInstance.id}`,
            );
            url = response.data.exposed?.credential_offer_endpoint;
            if (!url) {
                await new Promise((r) => setTimeout(r, 300));
                attempts++;
            }
        }

        if (!url) {
            throw new Error(
                `Failed to get credential_offer_endpoint after ${maxAttempts} attempts`,
            );
        }

        return url;
    }

    async waitForFinished(testInstanceId: string): Promise<TestResult> {
        const maxAttempts = 100;
        let attempts = 0;
        let logResult: TestResult | undefined;

        while (
            (!logResult || logResult.status !== "FINISHED") &&
            attempts < maxAttempts
        ) {
            const response = await this.instance.get<TestResult>(
                `/api/info/${testInstanceId}`,
            );
            logResult = response.data;
            if (logResult.status !== "FINISHED") {
                await new Promise((r) => setTimeout(r, 300));
                attempts++;
            }
        }

        if (!logResult || logResult.status !== "FINISHED") {
            throw new Error(
                `Test did not finish after ${maxAttempts} attempts`,
            );
        }

        return logResult;
    }
}
