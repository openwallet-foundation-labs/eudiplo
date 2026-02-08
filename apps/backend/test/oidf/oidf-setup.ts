/**
 * OIDF Test Setup
 *
 * This file provides setup and teardown hooks for OIDF conformance tests.
 * It manages TestContainers for the OIDF conformance suite (MongoDB, server, httpd).
 *
 * Usage in test files:
 *   import { useOidfContainers } from "./oidf-setup";
 *   useOidfContainers();
 *
 * Note: TestContainers.exposeHostPorts() starts an SSH container that maintains
 * a persistent connection. This must run in the same context as the test workers
 * (not in globalSetup), which is why we use beforeAll/afterAll hooks.
 */

import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
    GenericContainer,
    Network,
    type StartedNetwork,
    type StartedTestContainer,
    TestContainers,
    Wait,
} from "testcontainers";
import { afterAll, beforeAll } from "vitest";

const TEST_DB_PATH = resolve(__dirname, "../../../tmp/service.db");

let network: StartedNetwork | undefined;
let mongoDb: StartedTestContainer | undefined;
let containerServer: StartedTestContainer | undefined;
let containerHttp: StartedTestContainer | undefined;

/**
 * Setup OIDF containers - starts MongoDB, server, and httpd containers
 */
async function setupOidfContainers(): Promise<void> {
    try {
        await TestContainers.exposeHostPorts(3000);
        await TestContainers.exposeHostPorts(8443);

        // Create a custom network for container communication
        network = await new Network().start();

        const projectLabels = {
            "com.docker.compose.project": "fapi-test-suite",
        };

        // Start MongoDB first (dependency for server)
        mongoDb = await new GenericContainer("mongo:6.0.13")
            .withNetwork(network)
            .withNetworkAliases("mongodb")
            .withName("fapi-test-suite-mongodb")
            .withLabels(projectLabels)
            .start();
        console.log("MongoDB container started");

        // Start the FAPI test suite server (depends on MongoDB)
        console.log("Starting FAPI test suite server container...");
        containerServer = await new GenericContainer(
            "ghcr.io/cre8/oidf-conformance-suite-publisher/server:latest",
        )
            .withNetwork(network)
            .withNetworkAliases("server")
            .withName("fapi-test-suite-server")
            .withLabels(projectLabels)
            .withEntrypoint([
                "java",
                "-jar",
                "/server/fapi-test-suite.jar",
                "-Djdk.tls.maxHandshakeMessageSize=65536",
                "--fintechlabs.base_url=https://host.testcontainers.internal:8443",
                "--fintechlabs.devmode=true",
            ])
            .withWaitStrategy(Wait.forLogMessage(/.*Started Application in.*/))
            .start();
        console.log("FAPI test suite server container started");

        // Start httpd (depends on server)
        containerHttp = await new GenericContainer(
            "ghcr.io/cre8/oidf-conformance-suite-publisher/httpd:latest",
        )
            .withNetwork(network)
            .withName("fapi-test-suite-httpd")
            .withLabels(projectLabels)
            .withEnvironment({
                OIDC_GITLAB_CLIENTID: "fapi-test-suite-client",
                OIDC_GITLAB_CLIENTSECRET: "fapi-test-suite-secret",
            })
            .withExposedPorts({
                container: 8443,
                host: 8443,
            })
            .withWaitStrategy(Wait.forListeningPorts())
            .start();

        // Store the mapped port for tests
        const httpdPort = containerHttp.getMappedPort(8443);
        process.env.FAPI_TEST_URL = `https://localhost:${httpdPort}`;
        console.log(`FAPI test URL set to ${process.env.FAPI_TEST_URL}`);
    } catch (error) {
        console.error("Error during OIDF container setup:", error);
        // Clean up any containers that did start
        await teardownOidfContainers();
        throw error;
    }
}

/**
 * Teardown OIDF containers - stops all containers in reverse order
 */
async function teardownOidfContainers(): Promise<void> {
    console.log("Teardown for OIDF tests...");

    // Stop containers in reverse order of startup, with force removal
    try {
        if (containerHttp) {
            await containerHttp.stop({ remove: true, removeVolumes: true });
            console.log("Stopped httpd container");
        }
    } catch (error) {
        console.error("Error stopping httpd:", error);
    }

    try {
        if (containerServer) {
            await containerServer.stop({ remove: true, removeVolumes: true });
            console.log("Stopped server container");
        }
    } catch (error) {
        console.error("Error stopping server:", error);
    }

    try {
        if (mongoDb) {
            await mongoDb.stop({ remove: true, removeVolumes: true });
            console.log("Stopped MongoDB container");
        }
    } catch (error) {
        console.error("Error stopping MongoDB:", error);
    }

    // Wait a moment for Docker to clean up network connections
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
        if (network) {
            await network.stop();
            console.log("Stopped network");
        }
    } catch (error) {
        // If network removal fails, it might still have endpoints - try to force cleanup
        console.error("Error stopping network (will retry):", error);
        try {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await network?.stop();
            console.log("Stopped network on retry");
        } catch (retryError) {
            console.error("Failed to stop network on retry:", retryError);
        }
    }
}

/**
 * Delete the test database to ensure a fresh start
 */
export function deleteTestDatabase(): void {
    try {
        rmSync(TEST_DB_PATH, { force: true });
        console.log("Deleted test database for fresh start");
    } catch (error) {
        console.error("Error deleting test database:", error);
    }
}

/**
 * Setup hook for OIDF tests - starts required containers
 */
export async function setupOidfTest(): Promise<void> {
    console.log("Setting up OIDF test containers...");
    // Delete database to ensure fresh start for each test file
    deleteTestDatabase();
    try {
        await setupOidfContainers();
    } catch (error) {
        console.error("Failed to setup OIDF containers:", error);
        throw error;
    }
}

/**
 * Teardown hook for OIDF tests - stops containers
 */
export async function teardownOidfTest(): Promise<void> {
    await teardownOidfContainers();
}

/**
 * Convenience function to register OIDF setup/teardown hooks
 * Call this at the top level of your OIDF test file
 */
export function useOidfContainers(): void {
    beforeAll(setupOidfTest, 300000); // 5 minute timeout
    afterAll(teardownOidfTest);
}
