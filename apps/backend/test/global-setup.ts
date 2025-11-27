import path from "path";
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

export async function setup() {
    console.log("Global setup for backend tests...");
    // Create a custom network for container communication
    network = await new Network().start();

    // Start MongoDB first (dependency for server)
    mongoDb = await new GenericContainer("mongo:6.0.13")
        .withNetwork(network)
        .withNetworkAliases("mongodb")
        .start();
    console.log("MongoDB container started");

    // Start the FAPI test suite server (depends on MongoDB)
    containerServer = await new GenericContainer(
        "lunilein/conformance-suite-server:latest",
    )
        .withNetwork(network)
        .withNetworkAliases("server")
        .withBindMounts([
            {
                source: path.resolve("./target"),
                target: "/server",
            },
        ])
        .withCommand([
            "java",
            "-jar",
            "/server/fapi-test-suite.jar",
            "-Djdk.tls.maxHandshakeMessageSize=65536",
            "--fintechlabs.base_url=https://localhost.emobix.co.uk:8443",
            "--fintechlabs.devmode=true",
            "--fintechlabs.startredir=true",
        ])
        //.withWaitStrategy(Wait.))
        .start();
    console.log("FAPI test suite server container started");

    // Start httpd (depends on server)
    containerHttp = await new GenericContainer(
        "lunilein/conformance-suite-httpd:latest",
    )
        .withNetwork(network)
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
}

export async function teardown() {
    await containerHttp?.stop();
    await containerServer?.stop();
    await mongoDb?.stop();
    await network?.stop();
}
