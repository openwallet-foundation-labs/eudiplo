/**
 * Vitest Setup File
 *
 * This file runs in the same context as the test workers, which is required
 * for TestContainers' SSH port forwarder to work correctly. Using globalSetup
 * instead would cause tests to hang in run mode because the SSH connection
 * prevents the setup from completing properly.
 *
 * The OIDF containers are only started for tests in the /oidf/ directory.
 */
import { afterAll, beforeAll } from "vitest";
import { setupOidfContainers, teardownOidfContainers } from "./global-setup";

let isOidfTest = false;

beforeAll(async () => {
    // Check if we're running OIDF tests by checking the test file path
    const testPath = expect.getState().testPath;
    isOidfTest = testPath?.includes("/oidf/") ?? false;

    if (!isOidfTest) {
        return;
    }

    console.log("Setting up OIDF test containers...");
    try {
        await setupOidfContainers();
    } catch (error) {
        console.error("Failed to setup OIDF containers:", error);
        throw error;
    }
}, 300000); // 5 minute timeout for container startup

afterAll(async () => {
    if (!isOidfTest) {
        return;
    }

    await teardownOidfContainers();
});
