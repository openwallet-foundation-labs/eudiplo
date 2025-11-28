import {
    GenericContainer,
    Network,
    StartedNetwork,
    StartedTestContainer,
    Wait,
} from "testcontainers";

let network: StartedNetwork;
let mongoDb: StartedTestContainer;
let containerServer: StartedTestContainer;
let containerHttp: StartedTestContainer;

export default async function setup() {
    console.log("Global setup for backend tests...");
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
    containerServer = await new GenericContainer(
        "ghcr.io/cre8/oidf-conformance-suite-publisher/server:latest",
    )
        .withNetwork(network)
        .withNetworkAliases("server")
        .withName("fapi-test-suite-server")
        .withLabels(projectLabels)
        .withExtraHosts([
            {
                host: "host.docker.internal",
                ipAddress: "172.17.0.1",
            },
        ])
        .withEntrypoint([
            "java",
            "-jar",
            "/server/fapi-test-suite.jar",
            "-Djdk.tls.maxHandshakeMessageSize=65536",
            "--fintechlabs.base_url=https://localhost.emobix.co.uk:8443",
            "--fintechlabs.devmode=true",
            "--fintechlabs.startredir=true",
        ])
        .withWaitStrategy(
            Wait.forLogMessage(new RegExp(".*Started Application in.*")),
        )
        .start()
        .catch((err) => {
            console.error("Error starting server container:", err);
            throw err;
        });
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

    // Return the teardown function
    return async () => {
        console.log("Global teardown for backend tests...");
        try {
            await containerHttp?.stop();
            console.log("Stopped httpd container");
        } catch (error) {
            console.error("Error stopping httpd:", error);
        }
        try {
            await containerServer?.stop();
            console.log("Stopped server container");
        } catch (error) {
            console.error("Error stopping server:", error);
        }
        try {
            await mongoDb?.stop();
            console.log("Stopped MongoDB container");
        } catch (error) {
            console.error("Error stopping MongoDB:", error);
        }
        try {
            await network?.stop();
            console.log("Stopped network");
        } catch (error) {
            console.error("Error stopping network:", error);
        }
    };
}
